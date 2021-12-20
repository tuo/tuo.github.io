---
layout: post
title: "Video Merging with AVFoundation and OpenGL ES on iOS: Introduction"
date: 2014-12-26 20:00:46 +0800
published: true
tags: #tags go here: space-separated string
---


&nbsp;&nbsp;&nbsp;&nbsp;Video merging on iOS is kinda tricky even though there is good library like GPUImage there. If you look at the issue page of GPUImage, you would realize lots of the issues relates to *GPUImageMovie* or *GPUImageMovieWriter*, yes, it is very good at image processing, but for video, I'm not sure about that.

#  &nbsp;&nbsp;&nbsp;&nbsp;Problems
<hr/>

&nbsp;&nbsp;&nbsp;&nbsp;As I know from my personal experience, there are some problems with vide processing: 

1. it is very difficult to get timing correct, there are so often that some wierd black frames or flash appears at the start/end of final video, or the movie got ended too early like [author wrote on github.](https://github.com/BradLarson/GPUImage/issues/773#issuecomment-12507191)

   For example, you probably see this error when writing video lots of times:
	
> Problem appending pixel buffer at time:XXX*

and final video got some freeze frames.This however, from my experience, it relates to two same frametime got written. To verify this, you could write little extra debug code - array of frame time that got written and print all of them.
 
2. memory handling is very flaky - it is very often you got some memory warnings or crashes that are super frustrating.

3. error messages are just so raw and low level that are difficult to understand. 



![jackie_chan_by_rober_raik-d4cly01](http://d2h13boa5ecwll.cloudfront.net/misc/6aa4d738-8d54-11e4-8745-95e8c82121f3.png)


# &nbsp;&nbsp;&nbsp;&nbsp;New Approach
<hr/>

&nbsp;&nbsp;&nbsp;&nbsp;So I decide to try writing a simple video-processing(more specific chroma key) project using AVFoundation and OpenGL ES to see how hard it is. As you may know, the hard thing about it is you need to know OpenGL ES which is kinda scarying at the beginning, let alone combine with multithreading to acheive better performance. 

I did some performance benchmark, which is not that strictly but roughly accurate. I tested against [sample videos](https://github.com/tuo/tuo.github.io/tree/master/movies) with 640x640 pixels, 8 seconds duration.

Followings is the result:

######Two Videoes Chroma Key Merging (two vidoes)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|         	| GPUImage 	| AVFoundation+OpenGL ES 	|
|---------	|----------	|------------------------	|
| iPhone4 	| 44.79s   	| 11.90s                 	|
| iPod5   	| 4.68s    	| 3.87s                  	|
| iPhone6   | 1.44s     | 1.11s                  	|
|         	|          	|                        	|


######Three Videoes Alpha Channel Merging(three vidoes)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|         	| GPUImage 	| AVFoundation+OpenGL ES 	|
|---------	|----------	|------------------------	|
| iPhone4 	| 31.79s   	| 9.10s                 	|
| iPod5   	| 3.71s     | 3.41s                  	|
| iPhone6   | 1.62s     | 1.13s                  	|
|         	|          	|                        	|


######Note:

* on iPhone4: GPUImage throw tons of 'Couldn't write a frame' error, not be able to write a video or written video is chaotic or contains lots of feezing frames; well for custom AVFoundation+OpenGL ES,perfect full length, no frame dropping, frame synced perfectly. 

* on iPod5/iPhone6: final video from GPUImage ends earlier about 0.5s before full length) also frames is not fully synced, well, for custom AVFoundation+OpenGL ES, the final duration is perfect without any frame feezing.

I haven't got much time on testing on other devices but the results looks quite promoising, plus I haven't got any crash at all after running it many times - which GPUImage sometimes just crashes.

The problem with frame timing in GPUImage library lies in how it works. It use multithreading to get better performance, but it doens't have a good mechanism to handle frame time synching.

Here are some logs from console:

    2014-12-29 19:12:03.115 BBB[4989:60b] GPUImageMovie: captured_video_8A08021A-0886-4399-BC75-EE15C46D5963.mp4, duration: {354565/44100 = 8.040}
    2014-12-29 19:12:03.126 BBB[4989:60b] GPUImageMovie: APP_Likes.mp4, duration: {723840/90000 = 8.043}
    2014-12-29 19:12:03.225 BBB[4989:dd0f] ---captured_video_8A08021A-0886-4399-BC75-EE15C46D5963.mp4 newFrameReadyAtTime: 0.00
    2014-12-29 19:12:03.304 BBB[4989:dd0f] ---captured_video_8A08021A-0886-4399-BC75-EE15C46D5963.mp4 newFrameReadyAtTime: 0.04
    2014-12-29 19:12:03.320 BBB[4989:dd0f] ---captured_video_8A08021A-0886-4399-BC75-EE15C46D5963.mp4 newFrameReadyAtTime: 0.08
    2014-12-29 19:12:03.337 BBB[4989:de03] ---APP_Likes.mp4 newFrameReadyAtTime: 0.04
    2014-12-29 19:12:03.421 BBB[4989:dd0f] ---captured_video_8A08021A-0886-4399-BC75-EE15C46D5963.mp4 newFrameReadyAtTime: 0.13
    2014-12-29 19:12:03.443 BBB[4989:bb03] Wrote a video frame: 0.08
    2014-12-29 19:12:03.467 BBB[4989:dd0f] ---captured_video_8A08021A-0886-4399-BC75-EE15C46D5963.mp4 newFrameReadyAtTime: 0.17
    2014-12-29 19:12:03.481 BBB[4989:de03] ---APP_Likes.mp4 newFrameReadyAtTime: 0.08
    2014-12-29 19:12:03.542 BBB[4989:bb03] Wrote a video frame: 0.17

As you see the frametime is not perfectly synchronized between two readers, situation got even worse if you are doing three videoes merging. Why it happens? it is because how GPUImage library use multithreading.if you take a look at [code](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageMovie.m#L377) in GPUImageMovie(which is the one reading frame and upload to GPU), what **runSynchronouslyOnVideoProcessingQueue** refers to is just dispatch the reading/uploading block to a single serial queue in [GPUImageContext](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/iOS/GPUImageContext.m#L34)(singleton class to maintain one serial queue for multiple readers). 


Okay, this is how frame time works in video reader, how it handles frametime passed into video writer? There is the [newFrameReadyAtTime](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageTwoInputFilter.m#L209) in GPUImageTwoInputFilter class, which basically says: 

> "only if I got both uploaded output texture in GPU from  video readers, then I will pass **current condition-met frametime** to video writer and video writer will start writing. And any other case, I will just simply ignore any output from readers".

To better illustrate that, if you look at the above logs, so avasset reader finished frame reading and uploading at frame time 0.00, then it simply pass it to  GPUImageTwoInputFilter whom won't start write because it hasn't received second frame output yet, so it simply skips this frame(output is discarded) instead of pausing captured_video and starting APP_Likes because all video readers share same serial queue.


The new approach in this experiment is instead of what GPUImage currently does:

1. letting video readers take initiative, pass read&uploaded frame output to writer and just simply continue next frame processing

2. writer just simply discard whatever frames before both frame are received, which caues of inter-reader frame time out of  sync


what we are gonna do is:

1. video writer take the initiative, reader is passive. Writer ask all readers to read/upload next frame, and it won't start write or next-round reading at all,  unless all readers are returned with its final output texture

2. video writer will dispatch all reader's reading process to concurrent queue to achieve better performance instead of serial queue. We will leverage a greate feature **[GCD dispatch_async group](https://developer.apple.com/library/ios/documentation/General/Conceptual/ConcurrencyProgrammingGuide/OperationQueues/OperationQueues.html)** to make sure all paralle-running blocks are all done before start writing.


This approache will make sure we got frames synced perfectly also gain best performance.


# &nbsp;&nbsp;&nbsp;&nbsp;Breakdown
<hr/>


&nbsp;&nbsp;&nbsp;&nbsp;The goal that we wanna acheive is broken into three steps: 

1. One video source: take out green color component, and write to disk (single thread, simple glsl)

2. Two video sources: blend using chroma key, and write to disk (multi thread, little bit complicted glsl)

3. Three video sources: blend using white-alpha channel, and write to disk (multi thread, simple glsl)


&nbsp;&nbsp;&nbsp;&nbsp;Let's start from easiest first step: using avassetreader in avfoundation to read samples/frames from source video, then we upload to GPU with our magic glsl code to take out the green color component from it, after that we grab the output from fully rendered pixels in GPU, and write the transformed frames to final output movie in disk using avassetwriter avfoundation.

<br/>
##### &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Key Concept Walkthrough: OpenGL ES 

&nbsp;&nbsp;&nbsp;&nbsp;The difficult part in first step is OpenGL ES. You need to have basic knowledge about it, but it won't that difficult to pick up. You need to step back and change your mind little bit to old procedure programming.

To begin with OpenGL ES, I strongly recommend Ray Wenderlich's article [OpenGL Tutorial for iOS: OpenGL ES 2.0](http://www.raywenderlich.com/3664/opengl-tutorial-for-ios-opengl-es-2-0), it has a great walkthrough lots of important concept that we're gonna use in this series of blog. Just pay attention to how to create shader, compile shader, create vertex buffer, passing parameters and render. Note : you dont' need to know transform matrix as video merging is plainly just two dimension. 

But this is not enough yet, we need some way to upload image to GPU, which in OpenGL ES terms, called "texture", which is well covered in second part of blog: [OpenGL ES 2.0 for iPhone Tutorial Part 2: Textures](http://www.raywenderlich.com/4404/opengl-es-2-0-for-iphone-tutorial-part-2-textures). Note: you don't need know to depth buffer, just need to know how to map texture coordinates and send pixel data to GPU.

<br/>
##### &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Key Concept Walkthrough: AVFoundation

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AVFoundation is what we're gonna use for read/write frames from/to video. Apple has really good sessions from WWDC, which you could take a look. Also it has a greate resource in dev library in [Export](https://developer.apple.com/library/ios/documentation/AudioVideo/Conceptual/AVFoundationPG/Articles/05_Export.html) in [AV Foundation Programming Guide](https://developer.apple.com/library/ios/documentation/AudioVideo/Conceptual/AVFoundationPG/Articles/00_Introduction.html#//apple_ref/doc/uid/TP40010188-CH1-SW3), which covers reading/writing assets.

<br/>
##### &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Key Concept Walkthrough: OpenGL ES && AVFoundation 

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;How do combine those two keys together? I would really suggest a well reading through Apple's sample code [GLCameraRipple](https://developer.apple.com/library/ios/samplecode/GLCameraRipple/Introduction/Intro.html), what it does is: 

> This sample demonstrates how to use the AVFoundation framework to capture YUV frames from the camera and process them using shaders in OpenGL ES 2.0. CVOpenGLESTextureCache, which is new to iOS 5.0, is used to provide optimal performance when using the AVCaptureOutput as an OpenGL texture. In addition, a ripple effect is applied by modifying the texture coordinates of a densely tessellated quad.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;After that, you need be careful as we also need use avassetwrite to write to final video, which uses [AVAssetWriterInputPixelBufferAdaptor](https://developer.apple.com/library/mac/documentation/AVFoundation/Reference/AVAssetWriterInputPixelBufferAdaptor_Class/index.html) to append pixels that pulls from GPU ram. That requires a proper setup on avassetwriter.


![rage comic crazy](http://d2h13boa5ecwll.cloudfront.net/misc/ce63efbc-8d53-11e4-8d38-f5a577933cea.png)



As you see, it is not that complicted or scarying like what it says in above rage comic. We only need a fairly simple understanding of OpenGL ES(because we're working one 2D), multithreading(because we only need to know serial/concurrent queue and dispatch_async_group), AVFoundatation(well, just setup and read/write frames).


Without further ado, let's get our's dirty to get our first milestone done :) 
