---
layout: post
title: "GPUImage Movie Writer Exposure Problem"
date: 2014-01-05 15:38:24 +0800
published: true
tags: iOS,GPUImage,Chroma Key, GPUImageMovieWriter, Exposure
---

[GPUImage](https://github.com/BradLarson/GPUImage) is a great library for processing image and video on iOS. Recently I have used it for merging and blending two videos by applying [chroma key](http://en.wikipedia.org/wiki/Chroma_key) filter. The idea is we create two GPUImageMovie objects, one GPUImageChromaKeyBlendFilter and finally the GPUImageMovieWriter object. The code is like following:

{% highlight objectivec %} 
NSURL *urlA = [NSURL fileURLWithPath:self.tempMoviePath];
self.gpuMovieA = [[GPUImageMovie alloc] initWithURL:urlA];
self.gpuMovieA.playAtActualSpeed = true;
self.gpuMovieA.playSound = true;

NSURL *urlB = [[NSBundle mainBundle] URLForResource:fxMovie.movieName withExtension:@"mov"];
self.gpuMovieFX = [[GPUImageMovie alloc] initWithURL:urlB];
self.gpuMovieFX.playAtActualSpeed = true;

self.filter = [[GPUImageChromaKeyBlendFilter alloc] init];
[self.filter forceProcessingAtSize:CGSizeMake(640, 640)];

[self.gpuMovieFX addTarget:self.filter];
[self.gpuMovieA addTarget:self.filter];
[self.filter addTarget:self.outputView];

//setup writer
NSString *pathToMovie = [NSHomeDirectory() stringByAppendingPathComponent:
        [NSString stringWithFormat:@"Documents/%@_%@.%@",fxMovie.movieName, self.uuidOfVideo, VIDEO_SAVE_EXTENSION]];
unlink([pathToMovie UTF8String]); // If a file already exists, AVAssetWriter won't let you record new frames, so delete the old movie
self.convertedVideoPath = [NSURL fileURLWithPath:pathToMovie];
self.movieWriter = [[GPUImageMovieWriter alloc] initWithMovieURL:self.convertedVideoPath
                                                            size:CGSizeMake(640.0, 640.0) compressVideoOutput:YES];
[self.filter addTarget:self.movieWriter];    
self.movieWriter.shouldPassthroughAudio = YES;
self.gpuMovieA.audioEncodingTarget = self.movieWriter;
//add this line otherwise it will cause "Had to drop an audio frame" which cozes the saved video lose some sounds
[self.gpuMovieA enableSynchronizedEncodingUsingMovieWriter:self.movieWriter];

[self.movieWriter startRecording];
[self.gpuMovieA startProcessing];
[self.gpuMovieFX startProcessing];

__weak typeof(self) *sself = self;

[self.movieWriter setCompletionBlock:^{
    sself.gpuMovieA.audioEncodingTarget = nil;
    [sself.gpuMovieFX endProcessing];
    [sself.gpuMovieA endProcessing];
    [sself.movieWriter finishRecording];
    sself.recording = NO;
}];
{% endhighlight %} 	

The code is pretty straightforward. There is one problem with GPUImage movie merging, which is it can not merge two audio into final output video, but that's not the point of this blog.

So when you run the project and compare the video ouput with original video, you would find that the exposure and white balance get little weird, kinda like following picture:

![Exposure Chaos](https://doc-0o-7c-docs.googleusercontent.com/docs/securesc/eah3hotnktkgs5hnchu752lmr7fe6a8o/6vn3nrs3vopf5qai7rh2a1h49ftkjpfg/1388901600000/01854151473789099623/01854151473789099623/0B6o1WtyuFjd4dmxtWjBmbV9jd2M?h=16653014193614665626&nonce=lhdb7tbdpci44&user=01854151473789099623&hash=qilf97sl065i7ji40f95i7b33m8k44o2)

Kinda bizzare. I did search in github and found that there are some issues related to this like [#1313 GPUImageMovieWriter changes exposure and white balance](https://github.com/BradLarson/GPUImage/issues/1313) and [#1306 GPUImageView renders video brighter than AVPlayer](https://github.com/BradLarson/GPUImage/issues/1306).

And author Brad Larson did reply to this question in [https://github.com/BradLarson/GPUImage/issues/1306#issuecomment-29392636](https://github.com/BradLarson/GPUImage/issues/1306#issuecomment-29392636)

> That's most likely due to a slight difference in the way that I convert YUV sources to RGB when loading from movies and video sources. Look at the matrix applied in the kGPUImageYUVVideoRangeConversionForLAFragmentShaderString and the like. I had been using Apple's standard YUV conversion, then a couple of people changed it, saying that it didn't match what it should be. Perhaps they were wrong, and the color matrix still needs to be adjusted here.

Then hmmm, I am thinking maybe I should look up for this `kGPUImageYUVVideoRangeConversionForLAFragmentShaderString` in library and only to find that it is defined in [GPUVideoCamera.m](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageVideoCamera.m) class.

{% highlight objectivec %} 
NSString *const kGPUImageYUVVideoRangeConversionForLAFragmentShaderString = SHADER_STRING
(
 varying highp vec2 textureCoordinate;
 
 uniform sampler2D luminanceTexture;
 uniform sampler2D chrominanceTexture;
 uniform mediump mat3 colorConversionMatrix;

 void main()
 {
     mediump vec3 yuv;
     lowp vec3 rgb;
     
     yuv.x = texture2D(luminanceTexture, textureCoordinate).r;
     yuv.yz = texture2D(chrominanceTexture, textureCoordinate).ra - vec2(0.5, 0.5);
     rgb = colorConversionMatrix * yuv;

     gl_FragColor = vec4(rgb, 1);
 }
);
{% endhighlight %}

Nothing special here. I checked its commit history and found out that this commit [Re-working GPUImageVideoCamera to use the YUV->RGB transform method s…](https://github.com/BradLarson/GPUImage/commit/2ad3e9cbbc9a2943f61e1cde1587f09cc180c738#diff-0) is very suspicious.

My first action is revert this commit, but failed because in order to make GPUImageMovie support audio play I already made big change to this class. So I just changed the definition of `kGPUImageYUVVideoRangeConversionForLAFragmentShaderString` the GPUImageVideoCamera.m to original one:

{% highlight objectivec %} 
NSString *const kGPUImageYUVVideoRangeConversionForLAFragmentShaderString = SHADER_STRING
(
varying highp vec2 textureCoordinate;

uniform sampler2D luminanceTexture;
uniform sampler2D chrominanceTexture;

void main()
{
    mediump vec3 yuv;
    lowp vec3 rgb;

    yuv.x = texture2D(luminanceTexture, textureCoordinate).r;
    yuv.yz = texture2D(chrominanceTexture, textureCoordinate).ra - vec2(0.5, 0.5);

    // BT.601, which is the standard for SDTV is provided as a reference
    /*
     rgb = mat3(      1,       1,       1,
     0, -.39465, 2.03211,
     1.13983, -.58060,       0) * yuv;
     */

    // Using BT.709 which is the standard for HDTV
    rgb = mat3(      1,       1,       1,
            0, -.21482, 2.12798,
            1.28033, -.38059,       0) * yuv;

    gl_FragColor = vec4(rgb, 1);
}
);
{% endhighlight %}

Not sure just replacing the shader string is gonna be okay or not, but at least we tried out and the exposure problem solved. 

Hopefuly this could shed some light on others when using this library.


