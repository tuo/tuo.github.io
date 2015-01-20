---
layout: post
title: "GPUImage Video Merging: Timestamp Synchronization"
date: 2015-01-20 21:19:11 +0800
published: true
tags: #tags go here: space-separated string
---

One of tricky problem with GPUImage to merge multiple videos is that it could handle the frame timestamp perfectly synchronized between videos. You probably notice that the final merged output's duration is shorter comparing to original source videos.

There are several issues on github mentioned about this already: [video overlay from camera + audio #1413](https://github.com/BradLarson/GPUImage/issues/1413) and [Blend two movie inputs, maintaining sync #261](https://github.com/BradLarson/GPUImage/issues/261). As author mentioned in the [comment](https://github.com/BradLarson/GPUImage/issues/1413#issuecomment-34821619):

>The core problems come from the GPUImageTwoInputFilter, which the blends are subclassed from. Both movie sources provide their own timestamps for each frame that's passed in, but I'm not sure that I'm keeping these timestamps straight or in sync. Timestamps are passed down the filter chain and then used for the timestamps on recording in the movie writer, but keeping them in a consistent order and based on some synchronized time value isn't managed well.

>This is what triggers all the bizarre behavior people see around blending two movies together (something I never designed things for, and now need to find a way to fix). It's a tricky problem, and I don't spend a lot of time working with movie files, so it's not one of the areas I've put a lot of thought into.


#Out-of-Sync Timestamp : Why?
<hr/>

Let's recall how to setup chroma key to handle two video merging, which is quite typical use case:

{% highlight objectivec %}

NSURL *urlA = [NSURL fileURLWithPath:self.tempMoviePath];
self.gpuMovieA = [[GPUImageMovie alloc] initWithURL:urlA];

NSURL *urlB = [[NSBundle mainBundle] URLForResource:fxMovie.movieName withExtension:@"mov"];
self.gpuMovieFX = [[GPUImageMovie alloc] initWithURL:urlB];

self.filter = [[GPUImageChromaKeyBlendFilter alloc] init];
[self.filter forceProcessingAtSize:CGSizeMake(640, 640)];

[self.gpuMovieFX addTarget:self.filter];
[self.gpuMovieA addTarget:self.filter];

//setup writer
NSString *pathToMovie = [NSHomeDirectory() stringByAppendingPathComponent:@"Documents/output.mov"];
unlink([pathToMovie UTF8String]); // If a file already exists, AVAssetWriter won't let you record new frames, so delete the old movie
self.convertedVideoPath = [NSURL fileURLWithPath:pathToMovie];
self.movieWriter = [[GPUImageMovieWriter alloc] initWithMovieURL:self.convertedVideoPath size:CGSizeMake(640.0, 640.0)];
[self.filter addTarget:self.movieWriter];

[self.movieWriter startRecording];
[self.gpuMovieA startProcessing];
[self.gpuMovieFX startProcessing];

__weak typeof(self) *sself = self;
[self.movieWriter setCompletionBlock:^{
    [sself.gpuMovieFX endProcessing];
    [sself.gpuMovieA endProcessing];
    [sself.movieWriter finishRecording];
}];

{% endhighlight %} 	

Let's add some debug print in *newFrameReadyAtTime* in filter and movie writer, then give it a run.

Here is the logs from console:


    2015-01-20 17:40:38.870 BBB GPUImage Movie: video.mp4 duration: 8.07
    2015-01-20 17:40:38.878 BBB GPUImage Movie: APP_BOOMi_Paparazzi.mp4 duration: 8.09
    2015-01-20 17:40:39.035 BBB 0. processed frame at time: {1/600 = 0.002}
    2015-01-20 17:40:39.074 BBB 1. processed frame at time: {1000/24000 = 0.042}
    2015-01-20 17:40:39.192 BBB 0. processed frame at time: {7351/88200 = 0.083}
    2015-01-20 17:40:39.207 BBB 0. processed frame at time: {11026/88200 = 0.125}
    2015-01-20 17:40:39.214 BBB 0. processed frame at time: {14701/88200 = 0.167}
    2015-01-20 17:40:39.227 BBB 1. processed frame at time: {2000/24000 = 0.083}
    ...
    2015-01-20 17:40:50.245 BBB 0. processed frame at time: {697369/88200 = 7.907}
    2015-01-20 17:40:50.251 BBB 1. processed frame at time: {183000/24000 = 7.625}
    2015-01-20 17:40:50.305 BBB 0. processed frame at time: {701044/88200 = 7.948}
    2015-01-20 17:40:50.310 BBB 1. processed frame at time: {184000/24000 = 7.667}
    2015-01-20 17:40:50.366 BBB 0. processed frame at time: {704719/88200 = 7.990}
    2015-01-20 17:40:50.371 BBB 1. processed frame at time: {185000/24000 = 7.708}
    2015-01-20 17:40:50.425 BBB 0. processed frame at time: {708394/88200 = 8.032}
    2015-01-20 17:40:50.430 BBB writer finihsed
    2015-01-20 17:40:50.430 BBB 1. processed frame at time: {186000/24000 = 7.750}
    2015-01-20 17:40:50.501 BBB ----FINAL OUTPUT video duration: 7.75000, audio: 0.00000, cut needed: NO

You would notice that the execution order is not follow "0, 1, 0, 1" strictly, yeah, that's the problem, which causes, in the end, the last frame got written is **7.75000** rather than **8.000**.

The reason lies in the *readNextVideoFrameFromOutput* in GPUImageMovie, where it handles reading and processing frame:

{% highlight objectivec %}
- (BOOL)readNextVideoFrameFromOutput:(AVAssetReaderOutput *)readerVideoTrackOutput;
{
    if (reader.status == AVAssetReaderStatusReading && ! videoEncodingIsFinished)
    {
        CMSampleBufferRef sampleBufferRef = [readerVideoTrackOutput copyNextSampleBuffer];
        if (sampleBufferRef) 
        {
            //... other codes
            __unsafe_unretained GPUImageMovie *weakSelf = self;
            runSynchronouslyOnVideoProcessingQueue(^{
                [weakSelf processMovieFrame:sampleBufferRef];
                CMSampleBufferInvalidate(sampleBufferRef);
                CFRelease(sampleBufferRef);
            });
            return YES;
        }
}    
{% endhighlight %} 	


This line *runSynchronouslyOnVideoProcessingQueue* is the key to the answer. It simply dispatch the processing frame block to a serial queue across **all** movies. But there is no **dispatch-order-management**, which causes a race competition among all movies when all of them got sample buffers ready to be processed.

Because it is a serial queue, so the execution order is one at a time, hence fixed, but the **dispatch** block order is **kinda** random.

We need take a new approach to solve the dispatch order to make sure it follow strictly *01010101* order.


# Dispatch Block Order To Save
<hr/>

The idea is to have each movie has two extra properties: a boolean *pauseVideoRead* and a block *onProcessMovieFrameDone*.

The boolean *pauseVideoRead* is used to pause other movies's asset reading when one movie is being processed. 

The block *onProcessMovieFrameDone* is called at the end of frame processing and notify outside to pause current movie asset reading and resume asset reading and processing of next movie in pre-defined execution order list.


First, go to *GPUImageMovie* and change method *readNextVideoFrameFromOutput*: 

{% highlight objectivec %}
- (BOOL)readNextVideoFrameFromOutput:(AVAssetReaderOutput *)readerVideoTrackOutput;
{
    if (reader.status == AVAssetReaderStatusReading && ! videoEncodingIsFinished && !self.pauseVideoRead)
    {
        CMSampleBufferRef sampleBufferRef = [readerVideoTrackOutput copyNextSampleBuffer];
        if (sampleBufferRef) 
        {
            //...
            __unsafe_unretained GPUImageMovie *weakSelf = self;
            runSynchronouslyOnVideoProcessingQueue(^{
                [weakSelf processMovieFrame:sampleBufferRef];
                CMTime currentSampleTime = CMSampleBufferGetOutputPresentationTimeStamp(sampleBufferRef);
                CMSampleBufferInvalidate(sampleBufferRef);
                CFRelease(sampleBufferRef);
                
                if(weakSelf.onProcessMovieFrameDone){
                    weakSelf.onProcessMovieFrameDone(weakSelf, currentSampleTime);
                }
            });

            return YES;
        }
    }
}        
{% endhighlight %} 	


Quite a simple change and let's look the demo code in chroma key.

{% highlight objectivec %}
NSURL *urlA = [NSURL fileURLWithPath:self.tempMoviePath];
self.gpuMovieA = [[GPUImageMovie alloc] initWithURL:urlA];

NSURL *urlB = [[NSBundle mainBundle] URLForResource:fxMovie.movieName withExtension:@"mov"];
self.gpuMovieFX = [[GPUImageMovie alloc] initWithURL:urlB];

self.filter = [[GPUImageChromaKeyBlendFilter alloc] init];
[self.filter forceProcessingAtSize:CGSizeMake(640, 640)];

[self.gpuMovieFX addTarget:self.filter];
[self.gpuMovieA addTarget:self.filter];

//setup writer
NSString *pathToMovie = [NSHomeDirectory() stringByAppendingPathComponent:@"Documents/output.mov"];
unlink([pathToMovie UTF8String]); // If a file already exists, AVAssetWriter won't let you record new frames, so delete the old movie
self.convertedVideoPath = [NSURL fileURLWithPath:pathToMovie];
self.movieWriter = [[GPUImageMovieWriter alloc] initWithMovieURL:self.convertedVideoPath size:CGSizeMake(640.0, 640.0)];
[self.filter addTarget:self.movieWriter];

NSMutableArray *allMoviesByExecutionOrder = [NSMutableArray array];
[allMoviesByExecutionOrder addObject: self.gpuMovieA];
[allMoviesByExecutionOrder addObject: self.gpuMovieFX];

for(NSInteger i=0; i < allMoviesByExecutionOrder.count; i++){
    GPUImageMovie *movie = allMoviesByExecutionOrder[i];
    movie.pauseVideoRead = i != 0; //make first movie default to be not paused
}

//process each movie by orders in allMoviesByExecutionOrder
void (^onProcessFrameBlock)(GPUImageMovie *, CMTime) = ^(GPUImageMovie *movie, CMTime frameTime){
    movie.pauseVideoRead = YES;
    NSUInteger index = [allMoviesByExecutionOrder indexOfObject:movie];
    //NSLog(@"%d.Movie: %@ processed frame at time: %@", index,movie.url.lastPathComponent,CFBridgingRelease(CMTimeCopyDescription(kCFAllocatorDefault, frameTime)));
    if(index != NSNotFound){
        if(index == allMoviesByExecutionOrder.count - 1){
            index = 0;
        }else{
            index++;
        }
        GPUImageMovie *nextMovie = allMoviesByExecutionOrder[index];
        nextMovie.pauseVideoRead = NO;
    }
};

for (GPUImageMovie *movie in allMoviesByExecutionOrder) {
    movie.onProcessMovieFrameDone = onProcessFrameBlock;
}

//ready to go
[self.movieWriter startRecording];
for (GPUImageMovie *movie in allMoviesByExecutionOrder) {
    [movie startProcessing];
}

__weak typeof(self) *sself = self;
[self.movieWriter setCompletionBlock:^{
    for (GPUImageMovie *movie in allMoviesByExecutionOrder) {
        [movie endProcessing];
    }
    [sself.movieWriter finishRecording];
}];
{% endhighlight %} 	


*allMoviesByExecutionOrder* is very important to be noticed. It defines the order of movies to dispatch to be processed.
And inside *onProcessFrameBlock*, we pause current movie's reading and resume next movie's reading, so that it would ensure all movies are dispatched with correct order to prevent race competition.

Following is the part of logs from console after that:

    2015-01-20 17:36:39.936 BBB GPUImage Movie: video.mp4 duration: 8.07
    2015-01-20 17:36:39.942 BBB GPUImage Movie: APP_BOOMi_Paparazzi.mp4 duration: 8.09
    2015-01-20 17:36:40.138 BBB 0. processed frame at time: {1/600 = 0.002}
    2015-01-20 17:36:40.151 BBB 1. processed frame at time: {1000/24000 = 0.042}
    2015-01-20 17:36:40.296 BBB 0. processed frame at time: {7351/88200 = 0.083}
    2015-01-20 17:36:40.311 BBB 1. processed frame at time: {2000/24000 = 0.083}
    2015-01-20 17:36:40.369 BBB 0. processed frame at time: {11026/88200 = 0.125}
    ...
    2015-01-20 17:36:52.340 BBB 0. processed frame at time: {697369/88200 = 7.907}
    2015-01-20 17:36:52.346 BBB 1. processed frame at time: {190000/24000 = 7.917}
    2015-01-20 17:36:52.402 BBB 0. processed frame at time: {701044/88200 = 7.948}
    2015-01-20 17:36:52.410 BBB 1. processed frame at time: {191000/24000 = 7.958}
    2015-01-20 17:36:52.465 BBB 0. processed frame at time: {704719/88200 = 7.990}
    2015-01-20 17:36:52.476 BBB 1. processed frame at time: {192000/24000 = 8.000}
    2015-01-20 17:36:52.530 BBB 0. processed frame at time: {708394/88200 = 8.032}
    2015-01-20 17:36:52.535 BBB writer finihsed
    2015-01-20 17:36:52.550 BBB ----FINAL OUTPUT video duration: 8.00000, audio: 0.00000, cut needed: NO

Now you see the running order is strictly one after another, and final output shows the duration is perfect, yay!

# Performance
<hr/>

You may wonder since we restrict the order, would it have an impact on performance?

Here is the stats on iPod5 running multiple videos(8 seconds, 640*640 resolution) merging:

 * Two Videos   - before 10 seconds, after 11 seconds

 * Three Videos - before 11 seconds, after 12 seconds

 * Four Videos  - before 12 seconds, after 16 seconds


|              | Before(Order Dynamic)     | After(Order fixed)|
| ------------ | ------------------------- | ----------------- |
| Two Videos   | 10s                       | 11.0s             |
| Three Videos | 11s                       | 12.00s            |
| Four Videos  | 12s                       | 15.96s            |


Only when you process four video merging, you probably would notice the difference; for other cases, it just looks no difference.

All changes are available on github also: [Fix Video Timestamp Inconsistence - which video stops too early](https://github.com/tuo/GPUImage/commit/e99878196e85820be86296a53f1c40ada4a40b5f).










