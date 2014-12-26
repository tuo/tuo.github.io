---
layout: post
title: "Video Merging with AVFoundation and OpenGL ES on iOS: One Video Tweak"
date: 2014-12-26 20:00:46 +0800
published: false
tags: #tags go here: space-separated string
---


Video merging on iOS is kinda tricky even though there is good library like GPUImage there. If you look at the issue page of GPUImage, you would realize lots of the issues relates to *GPUImageMovie* or *GPUImageMovieWriter*, yes, it is very good at image processing, but for video, I'm not sure about that.

### Problems
As I know from my personal experience, there are some problems with vide processing: 

1. it is very difficult to get timing correct, there are so often that some wierd black frames or flash appears at the start/end of final video, or the movie got ended too early like [author wrote on github.](https://github.com/BradLarson/GPUImage/issues/773#issuecomment-12507191)

   For example, you probably see this error when writing video lots of times:
	
> Problem appending pixel buffer at time:XXX*

and final video got some freeze frames.This however, from my experience, it relates to two same frametime got written. To verify this, you could write little extra debug code - array of frame time that got written and print all of them.
 
2. memory handling is very flaky - it is very often you got some memory warnings or crashes that are super frustrating.

3. error messages are just so raw and low level that are difficult to understand. 


<div style="text-align:center; width:400px;height:400px; margin:0 auto" markdown="1">
![crazy](http://th00.deviantart.net/fs71/PRE/f/2011/285/4/b/jackie_chan_by_rober_raik-d4cly01.png)
</div>


### New Approach

So I decide to try writing a simple video-processing(more specific chroma key) project using AVFoundation and OpenGL ES to see how hard it is. As you may know, the hard thing about it is you need to know OpenGL ES which is kinda scarying at the beginning, let alone combine with multithreading to acheive better performance. 

I did some performance benchmark, which is not that strictly but roughly accurate. I tested against [sample videos](https://github.com/tuo/tuo.github.io/tree/master/movies) with 640x640 pixels, 8 seconds duration.

Followings is the result:

######Two Videoes Chroma Key Merging

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|         	| GPUImage 	| AVFoundation+OpenGL ES 	|
|---------	|----------	|------------------------	|
| iPhone4 	| 44.79s   	| 11.90s                 	|
| iPod5   	| 4.68s    	| 3.87s                  	|
|         	|          	|                        	|


######Three Videoes Alpha Channel Merging

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|         	| GPUImage 	| AVFoundation+OpenGL ES 	|
|---------	|----------	|------------------------	|
| iPhone4 	| 44.79s   	| 11.90s                 	|
| iPod5   	| 4.68s    	| 3.87s                  	|
|         	|          	|                        	|

**note: **

* on iPhone4: GPUImage throw tons of 'Couldn't write a frame' error, not be able to write a video or written video is chaotic or contains lots of feezing frames; well for custom AVFoundation+OpenGL ES,perfect full length, no frame dropping, frame synced perfectly. 

* on iPod5: final video from GPUImage ends earlier about 0.5s before full length), well, for custom AVFoundation+OpenGL ES, the final duration is perfect without any frame feezing.

I haven't got much time on testing on other devices but the results looks quite promoising, plus I haven't got any crash at all after running it many times - which GPUImage sometimes just crashes.

### Breakdown

The goal that we wanna acheive is broken into three steps: 

1. One video source: take out green color component, and write to disk

2. Two video sources: blend using chroma key, and write to disk

3. Three video sources: blend using white-alpha channel, and write to disk


Let's start from easiest: using avassetreader in avfoundation to read samples/frames from source video, then we upload to GPU with our magic glsl code to take out the green color component from it, after that we grab the output from fully rendered pixels in GPU, and write the transformed frames to final output movie in disk using avassetwriter avfoundation.