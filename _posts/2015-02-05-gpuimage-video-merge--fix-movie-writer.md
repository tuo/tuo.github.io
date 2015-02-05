---
layout: post
title: "GPUImage Video Merge: Fix Movie Writer"
date: 2015-02-05 21:57:39 +0800
published: true
tags: #tags go here: space-separated string
---

<br/>

I have been used GPUImage to do some chroma key video merge(I extended GPUImageThreeInputFilter to support four videos blending). But when I try to use GPUImageMovieWriter to write out blended videos, I found some problems - typically those are very flaky to reproduce and it just happens from time to time, which causes lots of headache.

Typical problems/limits you might run into when use GPUImageMovieWriter are:

* Output video got cut off Prematurely, i.e, last one second lost [#1403](https://github.com/BradLarson/GPUImage/issues/1403), [#1635](https://github.com/BradLarson/GPUImage/issues/1635)
* Only one audio track got written out [#934](https://github.com/BradLarson/GPUImage/issues/934)
* Frame dropping, frame time out of sync, some video frame freezes [#1501](https://github.com/BradLarson/GPUImage/issues/1501), [#744](https://github.com/BradLarson/GPUImage/issues/744)
* Video writing ends before audio's, which last one or two seconds video freeze [#830](https://github.com/BradLarson/GPUImage/issues/830)
* Black frames at the beginning [#52](https://github.com/BradLarson/GPUImage/issues/52), [#652](https://github.com/BradLarson/GPUImage/issues/652)
* Poor stability, random crashes [#773](https://github.com/BradLarson/GPUImage/issues/773), [#1634](https://github.com/BradLarson/GPUImage/issues/1634)


I already have elaborated on solutions to those problems in my blog [GPUImage Video Merging: Timestamp Synchronization](http://tuohuang.info/gpuimage-video-merging--timestamp-synchronization/)  and [GPUImage Movie Writer: Merging All Audio Tracks From Multiple Movies](http://tuohuang.info/gpuimage-movie-writer--merging-all-audio-tracks-from-multiple-movies).

But I need a way to incorporate those changes to library nicely without completely writing from scratch so that I could facilitate existing functions of GPUImage. 

What we will do is create three classes: THImageMovie, THImageMovieWriter and THImageMovieManager.

To start, let's duplicate GPUImageMovie and GPUImageMovieWriter and name it to THImageMovie and THImageMovieWriter.

# THImageMovie
<hr/>


In THImageMovie, we're not gonna do many changes:

{% highlight objectivec %}

- (void)processAsset
{
    reader = [self createAssetReader];


    AVAssetReaderOutput *readerAudioTrackOutput = nil;

    audioEncodingIsFinished = YES;
    for( AVAssetReaderOutput *output in reader.outputs ) {
        if( [output.mediaType isEqualToString:AVMediaTypeAudio] ) {
            audioEncodingIsFinished = NO;
            readerAudioTrackOutput = output;
        }
        else if( [output.mediaType isEqualToString:AVMediaTypeVideo] ) {
            readerVideoTrackOutput = output;
        }
    }

    if ([reader startReading] == NO) 
    {
            NSLog(@"Error reading from file at URL: %@", self.url);
        return;
    }

    //============================We delete all the code left, just signify that I'm done with asset warming up, ready to be processed
	dispatch_group_leave([THImageMovieManager shared].readingAllReadyDispatchGroup);
}

- (BOOL)renderNextFrame {
    __unsafe_unretained THImageMovie *weakSelf = self;
    if (reader.status == AVAssetReaderStatusReading && (!_shouldRepeat || keepLooping))
    {

        return [weakSelf readNextVideoFrameFromOutput:readerVideoTrackOutput];
    }

    if (reader.status == AVAssetWriterStatusCompleted) {
        NSLog(@"movie: %@ reading is done", self.url.lastPathComponent);
        [reader cancelReading];
        [weakSelf endProcessing];
    }

    return NO;
}

{% endhighlight %} 	


Above is the most important changes, we basically remove **readNextVideoFrameFromOutput** in processAsset method,  and add a new method *- (BOOL)renderNextFrame*. 

What we do is renderNextFrame is just read next video frame and return YES/NO if reading is completed. One important thing here we dont' call **endProcessing** in **readNextVideoFrameFromOutput** anymore, you could check in detail commit on github.

This is pretty much the changes for movie class.


# THImageMovieWriter
<hr/>


In header class THImageMovieWriter.h:

{% highlight objectivec %}
//add one more parameter movies to init method
- (id)initWithMovieURL:(NSURL *)newMovieURL size:(CGSize)newSize movies:(NSArray *)movies;

//remove the instance variable assetWriterPixelBufferInput and move it as property to prevent memory leak when used in block 
@property(nonatomic, retain) AVAssetWriterInputPixelBufferAdaptor *assetWriterPixelBufferInput;
{% endhighlight %} 


in THImageMovieWriter.m, First, let's add multiple audio tracks reader using **AVAssetReaderAudioMixOutput** and writer:

{% highlight objectivec %}
#pragma mark setupAssetWriter
- (void)setupAudioAssetReader {

    NSMutableArray *audioTracks = [NSMutableArray array];

    for(THImageMovie *movie in self.movies){
        AVAsset *asset = movie.asset;
        if(asset){
            NSArray *_audioTracks = [asset tracksWithMediaType:AVMediaTypeAudio];
            if(_audioTracks.count > 0){
                [audioTracks addObject:_audioTracks.firstObject];
            }
        }
    }
    AVMutableComposition* mixComposition = [AVMutableComposition composition];
    for(AVAssetTrack *track in audioTracks){
        if(![track isKindOfClass:[NSNull class]]){
            AVMutableCompositionTrack *compositionCommentaryTrack = [mixComposition addMutableTrackWithMediaType:AVMediaTypeAudio

                                                                                                preferredTrackID:kCMPersistentTrackID_Invalid];
            [compositionCommentaryTrack insertTimeRange:CMTimeRangeMake(kCMTimeZero, track.asset.duration)
                                                ofTrack:track
                                                 atTime:kCMTimeZero error:nil];
        }
    }

    self.assetAudioReader = [AVAssetReader assetReaderWithAsset:mixComposition error:nil];
    self.assetAudioReaderTrackOutput =
            [[AVAssetReaderAudioMixOutput alloc] initWithAudioTracks:[mixComposition tracksWithMediaType:AVMediaTypeAudio]
                                                       audioSettings:nil];

    [self.assetAudioReader addOutput:self.assetAudioReaderTrackOutput];
}

- (void)setupAudioAssetWriter{
    double preferredHardwareSampleRate = [[AVAudioSession sharedInstance] currentHardwareSampleRate];
    AudioChannelLayout acl;
    bzero( &acl, sizeof(acl));
    acl.mChannelLayoutTag = kAudioChannelLayoutTag_Mono;

    NSDictionary *audioOutputSettings = [NSDictionary dictionaryWithObjectsAndKeys:
            [ NSNumber numberWithInt: kAudioFormatMPEG4AAC], AVFormatIDKey,
            [ NSNumber numberWithInt: 1 ], AVNumberOfChannelsKey,
            [ NSNumber numberWithFloat: preferredHardwareSampleRate ], AVSampleRateKey,
            [ NSData dataWithBytes: &acl length: sizeof( acl ) ], AVChannelLayoutKey,
            //[ NSNumber numberWithInt:AVAudioQualityLow], AVEncoderAudioQualityKey,
            [ NSNumber numberWithInt: 64000 ], AVEncoderBitRateKey,
                    nil];

    assetWriterAudioInput = [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeAudio outputSettings:audioOutputSettings];
    [assetWriter addInput:assetWriterAudioInput];
    assetWriterAudioInput.expectsMediaDataInRealTime = _encodingLiveVideo;
}

{% endhighlight %} 


Next, change *startRecording* to following:

{% highlight objectivec %}
- (void)startRecording;
{
    dispatch_group_notify([THImageMovieManager shared].readingAllReadyDispatchGroup, dispatch_get_main_queue(), ^{
        NSLog(@"all set, readers and writer both are ready");
        [self setupAudioAssetReader];
        [self setupAudioAssetWriter];

        alreadyFinishedRecording = NO;
        isRecording = YES;

        BOOL aduioReaderStartSuccess = [self.assetAudioReader startReading];
        if(!aduioReaderStartSuccess){
            NSLog(@"asset audio reader start reading failed: %@", self.assetAudioReader.error);
            return;
        }

        startTime = kCMTimeInvalid;
        [self.assetWriter startWriting];
        [self.assetWriter startSessionAtSourceTime:kCMTimeZero];
        NSLog(@"asset write is good to write...");

        [self kickoffRecording];
    });
}

- (void)kickoffRecording {
    // If the asset reader and writer both started successfully, create the dispatch group where the reencoding will take place and start a sample-writing session.
    self.recordingDispatchGroup = dispatch_group_create();
    self.audioFinished = NO;
    self.videoFinished = NO;

    [self kickOffAudioWriting];
    [self kickOffVideoWriting];

    __unsafe_unretained typeof(self) weakSelf = self;
    // Set up the notification that the dispatch group will send when the audio and video work have both finished.
    dispatch_group_notify(self.recordingDispatchGroup, [THImageMovieManager shared].mainSerializationQueue, ^{
        weakSelf.videoFinished = NO;
        weakSelf.audioFinished = NO;
        [weakSelf.assetWriter finishWritingWithCompletionHandler:^{
            if(weakSelf.completionBlock){
                weakSelf.completionBlock();
            }
        }];
    });
}

{% endhighlight %} 

Here we only start process when all movies are ready and use dispatch_group to ensure audio and video both finished.


{% highlight objectivec %}
- (void)kickOffAudioWriting{
    dispatch_group_enter(self.recordingDispatchGroup);
    __unsafe_unretained typeof(self) weakSelf = self;

    CMTime shortestDuration = kCMTimeInvalid;
    for(THImageMovie *movie in self.movies) {
        AVAsset *asset = movie.asset;
        if(CMTIME_IS_INVALID(shortestDuration)){
            shortestDuration = asset.duration;
        }else{

            if(CMTimeCompare(asset.duration, shortestDuration) == -1){
                shortestDuration = asset.duration;
            }
        }
    }
	
    [assetWriterAudioInput requestMediaDataWhenReadyOnQueue:[THImageMovieManager shared].rwAudioSerializationQueue usingBlock:^{
        // Because the block is called asynchronously, check to see whether its task is complete.
        if (self.audioFinished)
            return;

        BOOL completedOrFailed = NO;
        // If the task isn't complete yet, make sure that the input is actually ready for more media data.
        while ([assetWriterAudioInput isReadyForMoreMediaData] && !completedOrFailed) {
            // Get the next audio sample buffer, and append it to the output file.
            CMSampleBufferRef sampleBuffer = [self.assetAudioReaderTrackOutput copyNextSampleBuffer];
            if (sampleBuffer != NULL) {
                CMTime currentSampleTime = CMSampleBufferGetOutputPresentationTimeStamp(sampleBuffer);
                BOOL isDone = CMTimeCompare(shortestDuration, currentSampleTime) == -1;
				
                BOOL success = [assetWriterAudioInput appendSampleBuffer:sampleBuffer];
                weakSelf.audioWroteDuration = CMTimeGetSeconds(currentSampleTime);
                if (success) {
                    //NSLog(@"append audio buffer success");
                } else {
                    NSLog(@"append audio buffer failed");
                }
                CFRelease(sampleBuffer);
                sampleBuffer = NULL;
                completedOrFailed = !success;

                if(isDone){                   
                    completedOrFailed = YES;
                }
            }
            else {
                completedOrFailed = YES;
            }
        }//end of loop

        if (completedOrFailed) {
            NSLog(@"kickOffAudioWriting wrint done");
            // Mark the input as finished, but only if we haven't already done so, and then leave the dispatch group (since the audio work has finished).
            BOOL oldFinished = self.audioFinished;
            self.audioFinished = YES;
            if (!oldFinished) {
                [assetWriterAudioInput markAsFinished];
                dispatch_group_leave(self.recordingDispatchGroup);
            };
        }
    }];
}
{% endhighlight %} 

in audio writng part, we got shortest duration of video and prevent final audio duration in output is longer than video.

{% highlight objectivec %}
- (void)kickOffVideoWriting {
    dispatch_group_enter(self.recordingDispatchGroup);
    self.isFrameRecieved = NO;
   __unsafe_unretained typeof(self) weakSelf = self;
    self.firstVideoFrameTime = -1;
    self.onFramePixelBufferReceived = ^(CMTime frameTime, CVPixelBufferRef pixel_buffer){        
        [weakSelf.assetWriterPixelBufferInput appendPixelBuffer:pixel_buffer withPresentationTime:frameTime];
        if(weakSelf.firstVideoFrameTime == -1){
            weakSelf.firstVideoFrameTime = CMTimeGetSeconds(frameTime);
        }
        CVPixelBufferUnlockBaseAddress(pixel_buffer, 0);
        weakSelf.videoWroteDuration = CMTimeGetSeconds(frameTime);
        if (![GPUImageContext supportsFastTextureUpload])
        {
            CVPixelBufferRelease(pixel_buffer);
        }
        weakSelf.isFrameRecieved = NO;
    };

    [assetWriterVideoInput requestMediaDataWhenReadyOnQueue:[THImageMovieManager shared].rwVideoSerializationQueue usingBlock:^{
        if (self.videoFinished)
            return;
        BOOL completedOrFailed = NO;
        // If the task isn't complete yet, make sure that the input is actually ready for more media data.
        while ([assetWriterVideoInput isReadyForMoreMediaData] && !completedOrFailed) {
            if(!self.isFrameRecieved){
                self.isFrameRecieved = YES;
                for(THImageMovie *movie in self.movies){
                    BOOL hasMoreFrame = [movie renderNextFrame];
                    //NSLog(@"--movie: %@, has more frames: %d", movie.url.lastPathComponent, hasMoreFrame);
                    if(!hasMoreFrame){
                        completedOrFailed = YES;
                        break;
                    }
                }
            }
        }

        if(completedOrFailed){
            NSLog(@"kickOffVideoWriting mark as finish");
            // Mark the input as finished, but only if we haven't already done so, and then leave the dispatch group (since the video work has finished).
            BOOL oldFinished = self.videoFinished;
            self.videoFinished = YES;
            if (!oldFinished) {
                for(THImageMovie *movie in self.movies){
                    [movie cancelProcessing];
                }
                [assetWriterVideoInput markAsFinished];
                dispatch_group_leave(self.recordingDispatchGroup);
            }
        }
    }];
}

{% endhighlight %} 

Here in video writing, we defined **onFramePixelBufferReceived** which should be called when final rendered result in GPU is ready in **newFrameReadyAtTime**. Only if we have recieved merged pixels then we kick off next video reading round. So in this way, we could ensure the frame-perfect video writing and fully synced timestamps.


{% highlight objectivec %}
- (void)newFrameReadyAtTime:(CMTime)frameTime atIndex:(NSInteger)textureIndex;
{
    if (!isRecording)
    {
        [firstInputFramebuffer unlock];
        return;
    }

//    // Drop frames forced by images and other things with no time constants
//    // Also, if two consecutive times with the same value are added to the movie, it aborts recording, so I bail on that case
//    if ( (CMTIME_IS_INVALID(frameTime)) || (CMTIME_COMPARE_INLINE(frameTime, ==, previousFrameTime)) || (CMTIME_IS_INDEFINITE(frameTime)) )
//    {
//        [firstInputFramebuffer unlock];
//        return;
//    }
//
//    if (CMTIME_IS_INVALID(startTime))
//    {
//        runSynchronouslyOnContextQueue(_movieWriterContext, ^{
//            if ((videoInputReadyCallback == NULL) && (assetWriter.status != AVAssetWriterStatusWriting))
//            {
//                [assetWriter startWriting];
//            }
//
//            [assetWriter startSessionAtSourceTime:frameTime];
//            startTime = frameTime;
//        });
//    }

    GPUImageFramebuffer *inputFramebufferForBlock = firstInputFramebuffer;
    glFinish();

    [_movieWriterContext useAsCurrentContext];

    [self renderAtInternalSizeUsingFramebuffer:inputFramebufferForBlock];

    CVPixelBufferRef pixel_buffer = NULL;

    if ([GPUImageContext supportsFastTextureUpload])
    {
        pixel_buffer = renderTarget;
        CVPixelBufferLockBaseAddress(pixel_buffer, 0);
    }
    else
    {
        CVReturn status = CVPixelBufferPoolCreatePixelBuffer (NULL, [self.assetWriterPixelBufferInput pixelBufferPool], &pixel_buffer);
        if ((pixel_buffer == NULL) || (status != kCVReturnSuccess))
        {
            CVPixelBufferRelease(pixel_buffer);
            return;
        }
        else
        {
            CVPixelBufferLockBaseAddress(pixel_buffer, 0);

            GLubyte *pixelBufferData = (GLubyte *)CVPixelBufferGetBaseAddress(pixel_buffer);
            glReadPixels(0, 0, videoSize.width, videoSize.height, GL_RGBA, GL_UNSIGNED_BYTE, pixelBufferData);
        }
    }



    runAsynchronouslyOnContextQueue(_movieWriterContext, ^{
        if (!assetWriterVideoInput.readyForMoreMediaData && _encodingLiveVideo)
        {
            [inputFramebufferForBlock unlock];
            NSLog(@"1: Had to drop a video frame: %@", CFBridgingRelease(CMTimeCopyDescription(kCFAllocatorDefault, frameTime)));
            return;
        }
        
        // Render the frame with swizzled colors, so that they can be uploaded quickly as BGRA frames
        [_movieWriterContext useAsCurrentContext];
        [self renderAtInternalSizeUsingFramebuffer:inputFramebufferForBlock];
        
        CVPixelBufferRef pixel_buffer = NULL;
        
        if ([GPUImageContext supportsFastTextureUpload])
        {
            pixel_buffer = renderTarget;
            CVPixelBufferLockBaseAddress(pixel_buffer, 0);
        }
        else
        {
            CVReturn status = CVPixelBufferPoolCreatePixelBuffer (NULL, [self.assetWriterPixelBufferInput pixelBufferPool], &pixel_buffer);
            if ((pixel_buffer == NULL) || (status != kCVReturnSuccess))
            {
                CVPixelBufferRelease(pixel_buffer);
                return;
            }
            else
            {
                CVPixelBufferLockBaseAddress(pixel_buffer, 0);
                
                GLubyte *pixelBufferData = (GLubyte *)CVPixelBufferGetBaseAddress(pixel_buffer);
                glReadPixels(0, 0, videoSize.width, videoSize.height, GL_RGBA, GL_UNSIGNED_BYTE, pixelBufferData);
            }
        }

        if(self.onFramePixelBufferReceived){
            self.onFramePixelBufferReceived(frameTime, pixel_buffer);
        }
        
        [inputFramebufferForBlock unlock];
    });
}
{% endhighlight %} 

In **newFrameReadyAtTime**, we remove the asset write append pixel buffer part and call **onFramePixelBufferReceived** to notify asset writer to continue next round frame processing.

For **THImageMovieManager**, we just create some serial queue for video and audio writing, nothing special there.

We're all good but how to give it run.

# Demo Run(Chroma Key)
<hr/> 

{% highlight objectivec %}

self.thMovieA = [[THImageMovie alloc] initWithURL:rawVideoURL];
self.thMovieFX = [[THImageMovie alloc] initWithURL:fxURL];
self.filter = [[GPUImageChromaKeyBlendFilter alloc] init];
[self.thMovieFX addTarget:self.filter];
[self.thMovieA addTarget:self.filter];

NSArray *thMovies = @[self.thMovieA, self.thMovieFX];
//setup writer
NSString *pathToMovie = [NSHomeDirectory() stringByAppendingPathComponent:@"Documents/th_output.mov"];
unlink([pathToMovie UTF8String]); // If a file already exists, AVAssetWriter won't let you record new frames, so delete the old movie
NSURL *outputURL = [NSURL fileURLWithPath:pathToMovie];
self.thMovieWriter =  [[THImageMovieWriter alloc] initWithMovieURL:outputURL size:CGSizeMake(640.0, 640.0) movies:thMovies];
[self.filter addTarget:self.thMovieWriter];

//---comment those audio one's
//self.movieWriter.shouldPassthroughAudio = YES;
//self.gpuMovieA.audioEncodingTarget = self.movieWriter;
//[self.gpuMovieA enableSynchronizedEncodingUsingMovieWriter:self.movieWriter];

[self.thMovieA startProcessing];
[self.thMovieFX startProcessing];
[self.thMovieWriter startRecording];

__weak typeof(self) weakSelf = self;
[self.thMovieWriter setCompletionBlock:^{
    [weakSelf.thMovieFX endProcessing];
    [weakSelf.thMovieA endProcessing];

	//no need to call finishRecording 
    NSLog(@"movie writing done");
}];


{% endhighlight %} 

There you go. 

I found this change has resolved all problems above and it runs quite stably(not even with a single crash spotted)

The commit is available on github: [Fix movie writer exporting](https://github.com/tuo/GPUImage/commit/38bba142a00c51c138621c0a4a73fe1132de4cdb) and you could run the sample project called [ChromaKeyVideoMerge](https://github.com/tuo/GPUImage/tree/master/examples/iOS/ChromaKeyVideoMerge)




