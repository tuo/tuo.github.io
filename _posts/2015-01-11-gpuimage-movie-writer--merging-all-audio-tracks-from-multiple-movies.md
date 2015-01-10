---
layout: post
title: "GPUImage Movie Writer: Merging All Audio Tracks From Multiple Movies"
date: 2015-01-11 22:13:24 +0800
published: true
tags: #tags go here: space-separated string
---

One tough problem when using GPUImage movie write output video with audio is that it only support one audio track. There is a github issue on it: [GPUImageMovieWriter can't export audiomix audio tracks issue #1834](https://github.com/BradLarson/GPUImage/issues/1834), [Audio writing issues with GPUImageMovieWriter](https://github.com/BradLarson/GPUImage/issues/934) and [Merging of video and audio](https://github.com/BradLarson/GPUImage/issues/1223). 

The author of GPUImage mentioned that in issue [Merging of video and audio #1223](https://github.com/BradLarson/GPUImage/issues/1223#issuecomment-25319869): 

> There currently is no way to do this kind of audio mixing. Only one audio source is used at a time.

But why GPUImageMovieWriter only support one audio track writing?!!! This really limits its capability and it shouldn't be like that.


<div style="text-align:center; width:400px;height:266px; margin:0 auto" markdown="1">
![jackie_chan_by_rober_raik-d4cly01](https://cloud.githubusercontent.com/assets/491610/5558101/6aa4d738-8d54-11e4-8745-95e8c82121f3.png)
</div>


#GPUImageMovieWriter: One Audio Source Only?
<hr/>


The reason that cause it only could handle one audio source during writing lies in the structure.

First, let's recall the code to do audio writing setup:

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
NSString *pathToMovie = [NSHomeDirectory() stringByAppendingPathComponent:
        [NSString stringWithFormat:@"Documents/output.mov"];
unlink([pathToMovie UTF8String]); // If a file already exists, AVAssetWriter won't let you record new frames, so delete the old movie
self.convertedVideoPath = [NSURL fileURLWithPath:pathToMovie];
self.movieWriter = [[GPUImageMovieWriter alloc] initWithMovieURL:self.convertedVideoPath
                                                            size:CGSizeMake(640.0, 640.0)];
[self.filter addTarget:self.movieWriter];    

self.movieWriter.shouldPassthroughAudio = YES;
self.gpuMovieA.audioEncodingTarget = self.movieWriter;
//add this line otherwise it will cause "Had to drop an audio frame" which cozes the saved video lose some sounds
[self.gpuMovieA enableSynchronizedEncodingUsingMovieWriter:self.movieWriter];

[self.movieWriter startRecording];
[self.gpuMovieA startProcessing];
[self.gpuMovieFX startProcessing];

{% endhighlight %} 	

Yes, it is this code who does the audio writing setup:

    self.movieWriter.shouldPassthroughAudio = YES;
    self.gpuMovieA.audioEncodingTarget = self.movieWriter;
    //add this line otherwise it will cause "Had to drop an audio frame" which cozes the saved video lose some sounds
    [self.gpuMovieA enableSynchronizedEncodingUsingMovieWriter:self.movieWriter];

Here you tell writer saying "hey, I want you to writer audio from gpuMovieA to final output video".

Once you dive into the code **enableSynchronizedEncodingUsingMovieWriter** in GPUImageMovie, it has called important method [**readNextAudioSampleFromOutput**](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageMovie.m#L404),which is kinda like following:

{% highlight objectivec %}
- (BOOL)readNextAudioSampleFromOutput:(AVAssetReaderOutput *)readerAudioTrackOutput;
{
    if (reader.status == AVAssetReaderStatusReading && ! audioEncodingIsFinished)
    {
        CMSampleBufferRef audioSampleBufferRef = [readerAudioTrackOutput copyNextSampleBuffer];
        if (audioSampleBufferRef)
        {
            //NSLog(@"read an audio frame: %@", CFBridgingRelease(CMTimeCopyDescription(kCFAllocatorDefault, CMSampleBufferGetOutputPresentationTimeStamp(audioSampleBufferRef))));
            [self.audioEncodingTarget processAudioBuffer:audioSampleBufferRef];
            CFRelease(audioSampleBufferRef);
            return YES;
        }
        ...
        }
    ...
    }
}    
{% endhighlight %} 	

Now you understand why it could only handle one audio writing. It is because audio's sample buffer is not like video's sample buffer which you could upload to GPU, render it using shader, then pull it down and write to disk. AKA: there is no way you could merge two audio sample buffer to create a "combining" effect like video.

We need take a new approach.


# Using AVComposition to Mix Multiple Audio Tracks
<hr/>

There you go, the new approach is to use AVComposition to merge two or more audio tracks together. I have written a blog on this already: [GPUImage Merge Videos with Chroma Key - GPUImageMovieWriter Two Audio Tracks](http://tuohuang.info/gpuimage-merge-videos-with-chroma-key-gpuimagemoviewriter-two-audio-tracks/#.VLE6KoqUce4), but that is just a very very raw spike, it doesn't synced with video writing, which is not acceptable.

### GPUImageMovie
<hr/>
First, let's see how we modified the GPUImageMovie by simply adding one method **(void)loadAsset:(dispatch_group_t)readyGroup;** and change other little bit:

{% highlight objectivec %}
- (void)loadAsset:(dispatch_group_t)readyGroup {
    NSAssert(self.url || self.asset, @"Url or asset should be passed for initial");
    NSAssert(readyGroup, @"should pass a ready group to tell when i'm ready");
    dispatch_group_enter(readyGroup);

    /*
    if( self.playerItem ) {
        [self processPlayerItem];
        return;
    }
    */
    if(self.url == nil && self.asset != nil)
    {
        //directly inited from outside
        dispatch_group_leave(readyGroup);
        return;
    }
    if (_shouldRepeat) keepLooping = YES;

    previousFrameTime = kCMTimeZero;
    previousActualFrameTime = CFAbsoluteTimeGetCurrent();

    NSDictionary *inputOptions = [NSDictionary dictionaryWithObject:[NSNumber numberWithBool:YES] forKey:AVURLAssetPreferPreciseDurationAndTimingKey];
    AVURLAsset *inputAsset = [[AVURLAsset alloc] initWithURL:self.url options:inputOptions];

    GPUImageMovie __block *blockSelf = self;

    [inputAsset loadValuesAsynchronouslyForKeys:[NSArray arrayWithObject:@"tracks"] completionHandler: ^{
        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            NSError *error = nil;
            AVKeyValueStatus tracksStatus = [inputAsset statusOfValueForKey:@"tracks" error:&error];
            if (tracksStatus != AVKeyValueStatusLoaded)
            {
                return;
            }
            NSLog(@"GPUImageMovie %@ loaded successfully", blockSelf.url.lastPathComponent);
            blockSelf.asset = inputAsset;
            dispatch_group_leave(readyGroup);
        });
    }];

}

- (void)startProcessing
{
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        if( self.playerItem ) {
            [self processPlayerItem];
            return;
        }
        [self processAsset];
    });
}
{% endhighlight %} 	


So basically we moved out the asset initialization code to **loadAsset** and now in **startProcessing** it only need to kick off **processAsset**(asset reading).

You may wonder what's the parameter in **loadAsset** is doing. Yeah, it is quite simple as GPUImageMovie need load tracks async for asset, we need a way to notify others that my asset is fully loaded and ready and I'm really good to kick asset reading part.

### GPUImageMovieWriter
<hr/>
Let's move to **GPUImageMovieWriter** class.

This is gonna be more change comparing to GPUImageMovie, but it is quite simple. We start by adding two variables:

{% highlight objectivec %}
@interface GPUImageMovieWriter : NSObject <GPUImageInput>
{
    BOOL alreadyFinishedRecording;
    ...
    AVAssetWriterInputPixelBufferAdaptor *assetWriterPixelBufferInput;

    //This is two new varaibles
    AVAssetReader *assetAudioReader;
    AVAssetReaderAudioMixOutput *assetAudioReaderTrackOutput;
{% endhighlight %} 	

Followed by adding **setupAudioReaderWithTracks** method to setup audio reader that mixing multiple audio tracks from movie:

{% highlight objectivec %}
- (void)setupAudioReaderWithTracks:(NSMutableArray *)audioTracks {
    if(audioTracks.count > 0){
        AVMutableComposition* mixComposition = [AVMutableComposition composition];

        for(AVAssetTrack *track in audioTracks){

            NSLog(@"track url: %@ duration: %.2f", track.asset, CMTimeGetSeconds(track.asset.duration));
            AVMutableCompositionTrack *compositionCommentaryTrack = [mixComposition addMutableTrackWithMediaType:AVMediaTypeAudio

                                                                                                preferredTrackID:kCMPersistentTrackID_Invalid];
            [compositionCommentaryTrack insertTimeRange:CMTimeRangeMake(kCMTimeZero, track.asset.duration)
                                                ofTrack:track
                                                 atTime:kCMTimeZero error:nil];

        }

        assetAudioReader = [AVAssetReader assetReaderWithAsset:mixComposition error:nil];
        assetAudioReaderTrackOutput =
                [[AVAssetReaderAudioMixOutput alloc] initWithAudioTracks:[mixComposition tracksWithMediaType:AVMediaTypeAudio]
                                                           audioSettings:nil];

        [assetAudioReader addOutput:assetAudioReaderTrackOutput];
    }
}
{% endhighlight %} 	

Nothing fancy except *AVAssetReaderAudioMixOutput* this part, which is magic :)

Then **- (void)startAudioRecording** to start reading, so that our audio reader is ready to go!

{% highlight objectivec %}
- (void)startAudioRecording {
    if(assetAudioReader){
        if(![assetAudioReader startReading]){
            NSLog(@"asset audio reader start reading failed: %@", assetAudioReader.error);
        }
    }
}
{% endhighlight %} 	


Next is the audio writing part, **- (void)startAudioWritingWithComplectionBlock:(void (^)())completionBlock**:

{% highlight objectivec %}
- (void)startAudioWritingWithComplectionBlock:(void (^)())completionBlock {
    if(assetAudioReader){
        audioQueue = dispatch_queue_create("com.sunsetlakesoftware.GPUImage.audioReadingQueue", NULL);
        [assetWriterAudioInput requestMediaDataWhenReadyOnQueue:audioQueue usingBlock:^{
            // Because the block is called asynchronously, check to see whether its task is complete.
            BOOL completedOrFailed = NO;
            // If the task isn't complete yet, make sure that the input is actually ready for more media data.
            while ([assetWriterAudioInput isReadyForMoreMediaData] && !completedOrFailed) {
                // Get the next audio sample buffer, and append it to the output file.
                CMSampleBufferRef sampleBuffer = [assetAudioReaderTrackOutput copyNextSampleBuffer];
                if (sampleBuffer != NULL) {
                    BOOL success = [assetWriterAudioInput appendSampleBuffer:sampleBuffer];
                    CFRelease(sampleBuffer);
                    sampleBuffer = NULL;
                    completedOrFailed = !success;
                }
                else {
                    completedOrFailed = YES;
                }
            }//end of loop

            if (completedOrFailed) {
                NSLog(@"audio wrint done");
                // Mark the input as finished, but only if we haven't already done so, and then leave the dispatch group (since the audio work has finished).
                audioEncodingIsFinished = YES;
                [assetWriterAudioInput markAsFinished];
                if(completionBlock){
                    completionBlock();
                }
            }
        }];
    } else{
        NSLog(@" no audio reader is being set, this could happen when no audio tracks being set");
        if(completionBlock){
            completionBlock();
        }
    }
}
{% endhighlight %} 	


Again, nothing quite special here. One thing to note is that we dont' call asset write finishing writing when audio wrting is done because that we need check video writing part, which means that we also need to add new method for handling video wrting finish.

{% highlight objectivec %}
- (void)finishVideoRecordingWithCompletionHandler:(void (^)(void))handler{

    runSynchronouslyOnContextQueue(_movieWriterContext, ^{
        isRecording = NO;
        videoEncodingIsFinished = YES;
        [assetWriterVideoInput markAsFinished];
        
        //ATTENTION: DO NOT CALL [assetWrite finishWriting] HERE

        if (handler)
            runAsynchronouslyOnContextQueue(_movieWriterContext, handler);
    });

}
{% endhighlight %} 	

The last thing which is also very important is that we need to modify **- (void)startRecording** to uncomment last line.

{% highlight objectivec %}
- (void)startRecording;
{
    alreadyFinishedRecording = NO;
    startTime = kCMTimeInvalid;
    runSynchronouslyOnContextQueue(_movieWriterContext, ^{
        if (audioInputReadyCallback == NULL)
        {
            [assetWriter startWriting];
        }
    });
    isRecording = YES;
    [assetWriter startSessionAtSourceTime:kCMTimeZero];
}
{% endhighlight %} 	

**[assetWriter startSessionAtSourceTime:kCMTimeZero];** this line of code has to be fired!

That's it for GPUImageMovieWriter. And That's all the changes for GPUImage part, but how the demo running code is gonna be looked like ?

### Demo Time
<hr/>

We're all set, let's take a look the demo code:

{% highlight objectivec %}
self.gpuMovieA = [[GPUImageMovie alloc] initWithURL:rawVideoURL];    
self.gpuMovieFX = [[GPUImageMovie alloc] initWithURL:fxURL];
    
self.filter = [[GPUImageChromaKeyBlendFilter alloc] init];
[self.gpuMovieFX addTarget:self.filter];
[self.gpuMovieA addTarget:self.filter];

//setup writer
NSString *pathToMovie = [NSHomeDirectory() stringByAppendingPathComponent:@"Documents/gpu_output.mov"];
unlink([pathToMovie UTF8String]); // If a file already exists, AVAssetWriter won't let you record new frames, so delete the old movie
self.outputURL = [NSURL fileURLWithPath:pathToMovie];
self.movieWriter =  [[GPUImageMovieWriter alloc] initWithMovieURL:self.outputURL size:CGSizeMake(640.0/2, 640.0/2)];
[self.filter addTarget:self.movieWriter];

NSArray *movies = @[self.gpuMovieA, self.gpuMovieFX];
dispatch_group_t movieReadyDispatchGroup = dispatch_group_create();
for(GPUImageMovie *movie in movies){
    [movie loadAsset:movieReadyDispatchGroup];
}

__weak typeof(self) weakSelf = self;
dispatch_group_notify(movieReadyDispatchGroup, dispatch_get_main_queue(), ^{
    NSLog(@"all movies are ready to process :)");
    NSMutableArray *audioTracks = [NSMutableArray array];
    for(GPUImageMovie *movie in movies){
        AVAssetTrack *track = [movie.asset tracksWithMediaType:AVMediaTypeAudio].firstObject;
        if(track){
            [audioTracks addObject:track];
        }
    }
    
    if(audioTracks.count > 0){
        [self.movieWriter setupAudioReaderWithTracks:audioTracks];
        [self.movieWriter setHasAudioTrack:YES]; //use default audio settings, setup asset writer audio
    }

    self.recordSyncingDispatchGroup = dispatch_group_create();

    //this has to be called before, to make sure all audio/video in movie writer is set
    [self.movieWriter startRecording];
    [self.movieWriter startAudioRecording];

    //video handling
    dispatch_group_enter(self.recordSyncingDispatchGroup);
    [self.gpuMovieA startProcessing];
    [self.gpuMovieFX startProcessing];
    [self.movieWriter setCompletionBlock:^{
        [weakSelf.gpuMovieFX endProcessing];
        [weakSelf.gpuMovieA endProcessing];
        [weakSelf.movieWriter finishVideoRecordingWithCompletionHandler:^{
            NSLog(@"===video wrote is done");
            dispatch_group_leave(weakSelf.recordSyncingDispatchGroup);
        }];
    }];
    
    //audio handling
    dispatch_group_enter(self.recordSyncingDispatchGroup);
    [self.movieWriter startAudioRecording];
    [self.movieWriter startAudioWritingWithComplectionBlock:^{
        NSLog(@"====audio wring is done");
        dispatch_group_leave(weakSelf.recordSyncingDispatchGroup);
    }];
    
    dispatch_group_notify(self.recordSyncingDispatchGroup, dispatch_get_main_queue(), ^{
        NSLog(@"vidoe and audio writing are both done-----------------");
        [self.movieWriter finishRecordingWithCompletionHandler:^{
            NSLog(@"final clean up is done :)");
        }];
    });

});
{% endhighlight %} 	


Let's start with this part:

{% highlight objectivec %}
NSArray *movies = @[self.gpuMovieA, self.gpuMovieFX];
dispatch_group_t movieReadyDispatchGroup = dispatch_group_create();
for(GPUImageMovie *movie in movies){
    [movie loadAsset:movieReadyDispatchGroup];
}
__weak typeof(self) weakSelf = self;
dispatch_group_notify(movieReadyDispatchGroup, dispatch_get_main_queue(), ^{
    NSLog(@"all movies are ready to process :)");
    NSMutableArray *audioTracks = [NSMutableArray array];
    for(GPUImageMovie *movie in movies){
        AVAssetTrack *track = [movie.asset tracksWithMediaType:AVMediaTypeAudio].firstObject;
        if(track){
            [audioTracks addObject:track];
        }
    }
}
{% endhighlight %} 	

We have used a dispatch group to make sure all GPUImageMovies has finished their initialization process, which at that time all assets are ready. Then we got all the audio tracks from movies for later use.

{% highlight objectivec %}
if(audioTracks.count > 0){
    [self.movieWriter setupAudioReaderWithTracks:audioTracks]; //setup audio readers from all tracks
    [self.movieWriter setHasAudioTrack:YES]; //use default audio settings, setup asset writer audio
}
{% endhighlight %} 	

This part is really easy, we check if any track is available, then tell movie writer to setup audio reader and writer.

{% highlight objectivec %}
self.recordSyncingDispatchGroup = dispatch_group_create();

//this has to be called before, to make sure all audio/video in movie writer is set
[self.movieWriter startRecording];
{% endhighlight %} 	

Here we use another dispatch group who helps us to cooridinate audio and video writing part as those two are both asynchrously. Then we fire startRecording,which just starts asset writer.

{% highlight objectivec %}
//video handling
dispatch_group_enter(self.recordSyncingDispatchGroup);
[self.gpuMovieA startProcessing];
[self.gpuMovieFX startProcessing];
[self.movieWriter setCompletionBlock:^{
    [weakSelf.gpuMovieFX endProcessing];
    [weakSelf.gpuMovieA endProcessing];
    [weakSelf.movieWriter finishVideoRecordingWithCompletionHandler:^{
        NSLog(@"===video wrote is done");
        dispatch_group_leave(weakSelf.recordSyncingDispatchGroup);
    }];
}];
{% endhighlight %} 	

This is the video writing part, be careful with **finishVideoRecordingWithCompletionHandler** as it is totally wrong if you call original method **finishRecordingWithCompletionHandler** or **finishRecording** because we control how movie writer when and how it should be finished.

{% highlight objectivec %}
//audio handling
dispatch_group_enter(self.recordSyncingDispatchGroup);
[self.movieWriter startAudioRecording];
[self.movieWriter startAudioWritingWithComplectionBlock:^{
    NSLog(@"====audio wring is done");
    dispatch_group_leave(weakSelf.recordSyncingDispatchGroup);
}];
{% endhighlight %} 	

Audio handling is pretty much same like video.(ps: I really should rename those methods name to be more consistent. For example, **startAudioRecording** acutally should be renamed to **startAudioReading**, and **startAudioWritingWithComplectionBlock** should be **finishAudioWritingWithComplectionBlock**)



Last part is the final completion code that video and audio are both finished their writing:

{% highlight objectivec %}
dispatch_group_notify(self.recordSyncingDispatchGroup, dispatch_get_main_queue(), ^{
    NSLog(@"vidoe and audio writing are both done-----------------");
    [self.movieWriter finishRecordingWithCompletionHandler:^{
        NSLog(@"final clean up is done :)");
        //you could fire some UI work on main queue
    }];
})
{% endhighlight %} 	

That's it, give a shoot in XCode, you should be able to what you expected! :)

# Conclusion
<hr/>

Man, working with low level threading and avfoundation is a challenage, working on a very complex existing codebase is damn super ultra challenge. 

I help someone could give some suggestions to make this library even better :)

All code and examples are available on github: [GPUImageMultpileAudioTracksMerge](https://github.com/tuo/GPUImageMultpileAudioTracksMerge)

And GPUImage changes are available on github also: [added support for merging all audio tracks from multiple movies](https://github.com/tuo/GPUImage/commit/4a3be64c6f1c0a44316045b71d70dd1714baa70c), you should be easy to get this pull request.










