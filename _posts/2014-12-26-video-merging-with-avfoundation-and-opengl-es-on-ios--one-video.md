---
layout: post
title: "Video Merging with AVFoundation and OpenGL ES on iOS: One Video"
date: 2014-12-26 23:36:11 +0800
published: true
tags: #tags go here: space-separated string
---


The goal of this article is to take a input video(e.g. green background video), do some magic in glsl(e.g.remove green color component), then write the output to a video on disk.

To illustrate that:

<h2 style="text-align:center">Before</h2>
<div style="text-align:center; width:400px;height:400px; margin:0 auto" markdown="1">
![screen shot 2014-12-26 at 11 43 21 pm](https://cloud.githubusercontent.com/assets/491610/5558217/2e7120aa-8d59-11e4-82c9-551b332c251e.png)
</div>
<h2 style="text-align:center">After</h2>

<div style="text-align:center; width:400px;height:400px; margin:0 auto" markdown="1">
![screen shot 2014-12-26 at 11 42 26 pm](https://cloud.githubusercontent.com/assets/491610/5558222/4cc203da-8d59-11e4-9876-d10e5c59185f.png)
</div>

<br/>
Note: this will invovles lots of coding, I will break into reasonable section with comments to make it clear.Before we jump into the code, I highly recommend you to watch [WWDC 2011 video 419 'Capturing from the Camera using AVFoundation on iOS 5'](https://developer.apple.com/videos/wwdc/2011/), which covers how to combine AVFoundation with OpenGL ES so that it would be much easier for you to understand what following is about.

## Code Walkthrough

We will have a video reader and video writer class to carray each's responsibility.

For video reader class, its responsiblities are:

1. pass in video url
2. setup [CVOpenGLESTextureCache](https://developer.apple.com/library/ios/documentation/CoreVideo/Reference/CVOpenGLESTextureCacheRef/) 
3. init asset and load tracks asyncronously when trigger *startProcess* is called
4. after tracks are loaded, setup AssetReader
5. kick off asset reader, now the reader is ready to pull out of frames, which is gonna be inited from video writer 

For video writer class, its responsiblities are:

1. on init, setupOpenGLESTextureCache
2. compile shaders(vertext/fragment,create program, link, get attributes/uniform handlers)
3. when being triggered with *startRecording*, setup AssetWriter, pay close attention to [AVAssetWriterInputPixelBufferAdaptor](https://developer.apple.com/library/mac/documentation/AVFoundation/Reference/AVAssetWriterInputPixelBufferAdaptor_Class/index.html)
4. start asset writer writing, now writer is ready
5. kick off recording


In step5(*kick off recording*), we will pull each frame from reader, then upload it to GPU with returned texture pointer, pass that pointer to GPU with name we defined in GLSL, render it, get back the pixel buffers mapped from final output of GPU, write that pixel buffer to our final destination video.


<div style="text-align:center; width:500px;height:375px; margin:0 auto" markdown="1">
![workflow](https://cloud.githubusercontent.com/assets/491610/5563835/469de488-8ed0-11e4-8f47-2fd925a4f654.jpg)
</div>

### Running 

{% highlight objectivec %}

fxURL = [[NSBundle mainBundle] URLForResource:@"FXSample" withExtension:@"mov"];
videoWriter = [[VideoWriter alloc] init];




{% endhighlight %} 	

  




			

