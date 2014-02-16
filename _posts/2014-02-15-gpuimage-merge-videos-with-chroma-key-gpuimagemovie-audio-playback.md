---
layout: post
title: "GPUImage Merge Videos with Chroma Key - GPUImageMovie Audio Playback"
date: 2014-02-15 09:38:51 +0800
published: true
tags: GPUImage,Chroma Key
---

Well, using [GPUImage](https://github.com/BradLarson/GPUImage) to merge two videos with chroma key is quite easy as what we see in following code snippet:

{% highlight objectivec %} 
NSURL *urlA = [[NSBundle mainBundle] URLForResource:@"captured_video" withExtension:@"mov"];
self.gpuMovieA = [[GPUImageMovie alloc] initWithURL:urlA];
self.gpuMovieA.playAtActualSpeed = true;

NSURL *urlB = [[NSBundle mainBundle] URLForResource:fxMovie.movieName withExtension:@"mov"];
self.gpuMovieFX = [[GPUImageMovie alloc] initWithURL:urlB];
self.gpuMovieFX.playAtActualSpeed = true;

self.filter = [[GPUImageChromaKeyBlendFilter alloc] init];
[self.filter forceProcessingAtSize:CGSizeMake(640, 640)];

[self.gpuMovieFX addTarget:self.filter];
[self.gpuMovieA addTarget:self.filter];
[self.filter addTarget:self.outputView];

//setup writer
NSString *pathToMovie = [NSHomeDirectory() stringByAppendingPathComponent:@"Documents/output.mov"];
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

Above code does work. However you probably notice that it has three problems:

* GPUImageMovie doens't have audio playback
* The merged video only have one audio track (not both tracks from each video)
* The merged video have some color degradation problem


So I'm walking through each items to show how to fix it. Well, I'm not sure the solution is best, at least it works(somehow #_#), hopefully it could inspire you with even better approach.

Topics would cover in this post are:

* GPUImageMovie audio playback 
* Movie writing with two audio tracks
* Fix the color degradation (too much brightness and exposure)

# GPUImageMovie Audio Playback

Well, this topic has been discussed quite a lot in GPUImage issue list, e.g. [Playing audio](https://github.com/BradLarson/GPUImage/issues/458), [audio in video filter issue](https://github.com/BradLarson/GPUImage/issues/306), [GPUImageMovie Audio Playback](https://github.com/BradLarson/GPUImage/issues/583).

Someone commented after the issue saying:

>> I also need this feature. I'm considering adopting a simpler work around. Play the audio of the origin file of the GPUImageMovie. Probable the sync between video and audio will be a problem since GPUImageMovie may not play at the original speed.

Then it comes an approach, which is that add a basic audio player to support playback (using AVAudioPlayer). Luckily he has uploaded a gist for reference: [Add Audio Playing to GPUImageMovie](https://gist.github.com/anonymous/5112961). 

You can set one of property (i.e. playSound) in GPUImageMovie to true when you want to have audio playback.

But someone replied to that comment saying he got some either crash or slience with new approach. I tried it little bit and found you probably need hack it little bit to get it work(as the codebase evolves so quickly, quite oftenly you need to do a merge @_@)

You can refer to my commit in github to see what exactly I did: 
[Added Play Audio support in GPUImageMovie](https://github.com/tuo/GPUImage/commit/b96d2d1ab43d99b018066d86834cce914cf02171).

Given the fact the hack is using AVAudioPlayer to play sound of the video, you must pay attention to the format of video. So if you use .mov video, you could get some errors about initializing audio player instance. Well, that is because AVAduioPlayer doesn't support .mov format:[Play Sound of .mov file with AVAudioPlayer](http://stackoverflow.com/questions/12531330/play-sound-of-mov-file-with-avaudioplayer). However, .mp4 file is okay.







