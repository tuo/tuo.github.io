---
layout: post
title: "Video Merging with AVFoundation and OpenGL ES on iOS: Multiple Audio Tracks Merge"
date: 2015-01-10 11:01:48 +0800
published: true
tags: #tags go here: space-separated string
---

One of problem with GPUImage library is that it couldn't write multiple audio tracks, you're only able to write one audio track at one time. But for our spike, we're gonna solve this problem by adopting a different perspective.

To merge multiple audio tracks from movies, we need to use [AVMutableComposition](https://developer.apple.com/library/mac/documentation/AVFoundation/Reference/AVMutableComposition_Class/index.html) which allows to create composition from different assets, i.e. here is the audio tracks. Then we use [AVAssetReaderAudioMixOutput](https://developer.apple.com/library/mac/documentation/AVFoundation/Reference/AVAssetReaderAudioMixOutput_Class/index.html) to read audio samples that result from mixing the audio from one or more tracks. Then we use [dispatch_group](https://developer.apple.com/library/ios/documentation/Performance/Reference/GCD_libdispatch_Ref/index.html#//apple_ref/c/func/dispatch_group_async) to coordinate video and audio writing process.

The complete code is on the github: [ThreeVidoes-Final](https://github.com/tuo/AVFoundationOpenGLESVideoProcessing/tree/master/ThreeVidoes-Final). You're free to download and try it.

# Prepare Audio Tracks
<hr/>

In VideoReader class, we add method to get audio tracks:

{% highlight objectivec %}

- (AVAssetTrack *)audioTrack{
    NSAssert(self.asset, @"Asset should be inited before access");
    NSArray *audioTracks = [self.asset tracksWithMediaType:AVMediaTypeAudio];
    return audioTracks.firstObject;
}

{% endhighlight %} 	


# Setup Audio AssetReader
<hr/>

Then in VideoWriter, we need to setup audio asset reader from avcomposition:

{% highlight objectivec %}

- (void)setupAssetAudioReaderAndWriter {
    NSArray *audioTracks = [@[self.readerFX, self.readerRaw, self.readerAlpha] valueForKey:@"audioTrack"];
    NSLog(@"audioTracks: %@", audioTracks);

    AVMutableComposition* mixComposition = [AVMutableComposition composition];

    for(AVAssetTrack *track in audioTracks){
        if(![track isKindOfClass:[NSNull class]]){
            NSLog(@"track url: %@ duration: %.2f", track.asset, CMTimeGetSeconds(track.asset.duration));
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

    NSAssert(self.assetWriter, @"Writer should be inited");

    //Use default audio outputsettings

    //http://stackoverflow.com/questions/4149963/this-code-to-write-videoaudio-through-avassetwriter-and-avassetwriterinputs-is
    // Add the audio input
    AudioChannelLayout acl;
    bzero( &acl, sizeof(acl));
    acl.mChannelLayoutTag = kAudioChannelLayoutTag_Mono;

    NSDictionary *audioOutputSettings = [ NSDictionary dictionaryWithObjectsAndKeys:
            [ NSNumber numberWithInt: kAudioFormatAppleLossless ], AVFormatIDKey,
            [ NSNumber numberWithInt: 16 ], AVEncoderBitDepthHintKey,
            [ NSNumber numberWithFloat: 44100.0 ], AVSampleRateKey,
            [ NSNumber numberWithInt: 1 ], AVNumberOfChannelsKey,
            [ NSData dataWithBytes: &acl length: sizeof( acl ) ], AVChannelLayoutKey,
                    nil ];

    self.assetWriterAudioInput =  [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeAudio
                                                                         outputSettings:audioOutputSettings];

    self.assetWriterAudioInput.expectsMediaDataInRealTime = YES;

    NSParameterAssert(self.assetWriterAudioInput);
    NSParameterAssert([self.assetWriter canAddInput:self.assetWriterAudioInput]);
    [self.assetWriter addInput:self.assetWriterAudioInput];
}

{% endhighlight %} 	

Also need to change minor bit on startRecording warmup code:

{% highlight objectivec %}

- (void)startAssetWriter {
    BOOL aduioReaderStartSuccess = [self.assetAudioReader startReading];
    if(!aduioReaderStartSuccess){
        NSLog(@"asset audio reader start reading failed: %@", self.assetAudioReader.error);
        return;
    }
    BOOL success = [self.assetWriter startWriting];
    if (!success){
        NSLog(@"asset write start writing failed: %@", self.assetWriter.error);
        return;
    }
    [self.assetWriter startSessionAtSourceTime:kCMTimeZero];
    NSLog(@"asset write is good to write...");
}

- (void)startRecording {
    dispatch_async([ContextManager shared].mainSerializationQueue, ^{
        [self setupAssetWriterVideo];
        // Set up the notification that the dispatch group will send when the audio and video work have both finished.
        dispatch_group_notify([ContextManager shared].readingAllReadyDispatchGroup, [ContextManager shared].mainSerializationQueue, ^{
            NSLog(@"all set, readers and writer both are ready");
            [self setupAssetAudioReaderAndWriter];
            [self startAssetWriter];
            [self kickoffRecording];
        });
    });
}

{% endhighlight %} 	

#Audio Writing 
<hr/>

Audio writing is quite straightforward:

{% highlight objectivec %}

- (void)kickOffAudioWriting {
    NSAssert(self.recordingDispatchGroup, @"Recording dispatch group should be inited to sync audio/video writing");
    // If there is audio to reencode, enter the dispatch group before beginning the work.
    dispatch_group_enter(self.recordingDispatchGroup);
    // Specify the block to execute when the asset writer is ready for audio media data, and specify the queue to call it on.
    [self.assetWriterAudioInput requestMediaDataWhenReadyOnQueue:[ContextManager shared].rwAudioSerializationQueue usingBlock:^{
        // Because the block is called asynchronously, check to see whether its task is complete.
        if (self.audioFinished)
            return;

        BOOL completedOrFailed = NO;
        // If the task isn't complete yet, make sure that the input is actually ready for more media data.
        while ([self.assetWriterAudioInput isReadyForMoreMediaData] && !completedOrFailed) {
            // Get the next audio sample buffer, and append it to the output file.
            CMSampleBufferRef sampleBuffer = [self.assetAudioReaderTrackOutput copyNextSampleBuffer];
            if (sampleBuffer != NULL) {
                BOOL success = [self.assetWriterAudioInput appendSampleBuffer:sampleBuffer];
                if (success) {
                    NSLog(@"append audio buffer success");
                } else {
                    NSLog(@"append audio buffer failed");
                }
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
            BOOL oldFinished = self.audioFinished;
            self.audioFinished = YES;
            if (!oldFinished) {
                [self.assetWriterAudioInput markAsFinished];
                dispatch_group_leave(self.recordingDispatchGroup);
            };
        }
    }];
}

{% endhighlight %} 	


Okay, we're good with audio writing, next we need coordinate audio with video.

# Audio&&Video Writing Sync
<hr/>

As you may see above, we have used self.recordingDispatchGroup for audio writing, let's take a look on how it works with audio/video together.

{% highlight objectivec %}

- (void)kickoffRecording {

    // If the asset reader and writer both started successfully, create the dispatch group where the reencoding will take place and start a sample-writing session.
    self.recordingDispatchGroup = dispatch_group_create();
    self.audioFinished = NO;
    self.videoFinished = NO;


    [self kickOffAudioWriting];

    [self kickOffVideoWriting];


    // Set up the notification that the dispatch group will send when the audio and video work have both finished.
    dispatch_group_notify(self.recordingDispatchGroup, [ContextManager shared].mainSerializationQueue, ^{
        self.videoFinished = NO;
        self.audioFinished = NO;
        [self.assetWriter finishWritingWithCompletionHandler:^{
            dispatch_async(dispatch_get_main_queue(), ^{
                if(self.onWritingFinishedBlock){
                    self.onWritingFinishedBlock();
                }
            });
        }];
    });
}

    
{% endhighlight %} 


# Conclusion
<hr/>
That's it. Now you're able to merge audio and video frames from multiple movies.

What's next is to use OpenGL ES Analyzer to improve the performance.




    