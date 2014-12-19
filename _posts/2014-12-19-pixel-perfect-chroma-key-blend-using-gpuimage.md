---
layout: post
title: "Pixel Perfect Chroma Key Blend Using GPUImage"
date: 2014-12-19 19:07:19 +0800
published: true
tags: GPUImage,Chroma Key
---

If you 're doing chroma key blend with *GPUImageChromaKeyBlendFilter* from [**GPUImage**](https://github.com/BradLarson/GPUImage) library like what I did in this post [GPUImage Movie Writer Exposure Problem](http://tuohuang.info/gpuimage_movie_writer_exposure_problem), then you're very likely to find that it is very tricky to get pixel-perfect blend result:(e.g. annoying green lines around edges no matter how hard you tweak the threshold and smoothing parameter, also you need ask animation creator to be careful to not picking any close colors against the background green color which is super frustrating to them).

The reason is that if you look into the OpenGL ES GLSL code in [GPUImageChromaKeyBlendFilter.m](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageChromaKeyBlendFilter.m#L6), you could find that actually it masks out the color which is close to background color(like green color by default). And this masking part is not very precise when it comes to some colors between background and character. 

Then you probably wonder how [Action Movie FX](https://itunes.apple.com/us/app/action-movie-fx/id489321253?mt=8) got this pixel-perfect blending video. After some hack, I got a clear idea about it. Following is the diagram:

<div style="text-align:center; width:400px;height:400px; margin:0 auto" markdown="1">
![source video](https://cloud.githubusercontent.com/assets/491610/5502005/67878f7a-879e-11e4-89ad-618555878d02.png)
</div>
<h1 style="text-align:center">+</h1>

<div style="text-align:center; width:400px;height:400px; margin:0 auto" markdown="1">
![Alpha video](https://cloud.githubusercontent.com/assets/491610/5501957/cc1b5d0a-879d-11e4-9a03-c7c4398ed12e.png):
</div>
<h1 style="text-align:center">+</h1>
<div style="text-align:center; width:400px;height:400px; margin:0 auto" markdown="1">
![FX video](https://cloud.githubusercontent.com/assets/491610/5501958/cc1d6172-879d-11e4-8029-d62a38c96df0.png):
</div>

<h1 style="text-align:center">=</h1>

<div style="text-align:center; width:400px;height:400px; margin:0 auto; margin-bottom:30px" markdown="1">

![blended video](https://cloud.githubusercontent.com/assets/491610/5501981/2ef0e490-879e-11e4-9390-a70e4839d74c.png)

</div>

As you see, it is not using green color as reference for cutting color, instead it got from a alpha-channel video (black-and-white).

Already someone posts an question for it on GPUImage issues list :[Chroma or alpha on videos? #255](https://github.com/BradLarson/GPUImage/issues/255), Brad has given some suggestions on it but there wasn't any code about it. However, very obviously that instead of use two input filters like *GPUImageChromaKeyBlendFilter*, this has to use three input filters like [*GPUImageThreeInputFilter.m*](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageThreeInputFilter.m). If you looks at the code inside *GPUImageChromaKeyBlendFilter*, it notice that it doesnt' have custom fragment shader to it, yes, it is designed to be subclassed to implement custom rendering.

After spent some time on tweaking it, I finally got it work. If you use GPUImage as pod dependency, I suggest to git clone a copy to your local computer, then change *Podfile* in XCode spike project to refer to local copy, so that you could easily debug it.

*Podfile*

	platform :ios, '7.0'	
	# ignore all warnings from all pods
	inhibit_all_warnings!
	
	#pod 'GPUImage', :path => ':git => 'https://github.com/XXX/GPUImage.git''
	pod 'GPUImage', :path => '~/Documents/git/spikes/GPUImage'


Followings are the steps to do it:

####1. Open GPUImage project and create *THMovieAlphaBlendFilter*

{% highlight objectivec %} 

#import "GPUImageThreeInputFilter.h"
 
@interface THMovieAlphaBlendFilter : GPUImageThreeInputFilter {
 
}

@end

{% endhighlight %} 	
	
####2. Change *THMovieAlphaBlendFilter.m* file 

{% highlight objectivec %} 
#import "THMovieAlphaBlendFilter.h"

NSString *const kTHMovieAlphaBlendFragmentShaderString = SHADER_STRING
(
 precision highp float;
 
 varying highp vec2 textureCoordinate;
 varying highp vec2 textureCoordinate2;
 varying highp vec2 textureCoordinate3;
 
 uniform sampler2D inputImageTexture;
 uniform sampler2D inputImageTexture2;
 uniform sampler2D inputImageTexture3;
 
 void main()
 {
     vec4 textureColorAlpha = texture2D(inputImageTexture, textureCoordinate);//alpha
     vec4 textureColorFX = texture2D(inputImageTexture2, textureCoordinate2); //fx
     vec4 textureColorSrc = texture2D(inputImageTexture3, textureCoordinate3); //src
 
     gl_FragColor = mix(textureColorFX, textureColorSrc, 1.0 -textureColorAlpha.r);	     
     
 });


@implementation THMovieAlphaBlendFilter
	
- (id)init;
{
    if (!(self = [super initWithFragmentShaderFromString:kTHMovieAlphaBlendFragmentShaderString]))
    {
        return nil;
    }	    	    
    return self;
}
@end

{% endhighlight %} 	

The key part is *gl_FragColor = mix(textureColorFX, textureColorSrc, 1.0 -textureColorAlpha.r);* , as you see the third parameter (blend value) is the value of color component from alpha-channel video.

####3. Setup and run demo code

{% highlight objectivec %} 
@interface ViewController ()
@property (nonatomic, strong) GPUImageMovie *gpuMovieAlpha;
@property (nonatomic, strong) GPUImageMovie *gpuMovieFX;
@property (nonatomic, strong) GPUImageMovie *gpuMovieSource;
@property (nonatomic, strong) GPUImageMovieWriter *movieWriter;
@property (nonatomic, strong) THMovieAlphaBlendFilter *filter;
@end

@implementation ViewController

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    
    NSURL *urlApha = [[NSBundle mainBundle] URLForResource:@"fireworks_alpha_sd" withExtension:@"mp4"];
    self.gpuMovieAlpha = [[GPUImageMovie alloc] initWithURL:urlApha];

    NSURL *urlFX = [[NSBundle mainBundle] URLForResource:@"fireworks_sd" withExtension:@"mp4"];
    self.gpuMovieFX = [[GPUImageMovie alloc] initWithURL:urlFX];

    
    NSURL *urlSource = [[NSBundle mainBundle] URLForResource:@"source" withExtension:@"mov"];
    self.gpuMovieSource = [[GPUImageMovie alloc] initWithURL:urlSource];
    
    self.filter = [[THMovieAlphaBlendFilter alloc] init];
    
    [self.gpuMovieAlpha addTarget:self.filter];
    [self.gpuMovieFX addTarget:self.filter];
    [self.gpuMovieSource addTarget:self.filter];
    
    NSString *pathToMovie = [NSHomeDirectory() stringByAppendingPathComponent:
                             [NSString stringWithFormat:@"Documents/%@.%@",@"output", @"mp4"]];
    unlink([pathToMovie UTF8String]);
    NSURL *outputPath = [NSURL fileURLWithPath:pathToMovie];
    self.movieWriter = [[GPUImageMovieWriter alloc] initWithMovieURL:outputPath size:CGSizeMake(640.0, 640.0)];
    [self.filter addTarget:self.movieWriter];
    
    [self.movieWriter startRecording];
    [self.gpuMovieAlpha startProcessing];
    [self.gpuMovieFX startProcessing];
    [self.gpuMovieSource startProcessing];
 
    __weak typeof(self) weakSelf = self;
    [self.movieWriter setCompletionBlock:^{
        [weakSelf.gpuMovieAlpha endProcessing];
        [weakSelf.gpuMovieFX endProcessing];
        [weakSelf.gpuMovieSource endProcessing];
        [weakSelf.movieWriter finishRecording];
    }];
    
}
@end

{% endhighlight %} 	
	
Extreme care should be taken for the order of *addTarget:self.filter* part, as this order maps strictly to the order in GLSL fragment shader.

There you go, you should be able to get pixel-perfect blended videos, no pulling hairs from animation creators.

All videos(including alpha-channel, fx, source) mentioned in above code could be found here : [sample videos](https://github.com/tuo/tuo.github.io/tree/master/movies). Just quick reminder, the sample vidoeos are just for studying code purpose, do not distribute or use for commercial.





	















