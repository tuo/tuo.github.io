---
layout: post
title: "GPUImage Merge Videos with Chroma Key - GPUImageMovieWriter Two Audio Tracks"
date: 2014-02-16 09:38:51 +0800
published: true
tags: GPUImage,Chroma Key
---

Let's continue second topic about `Merging videos with GPUImage`: Writing both audio tracks of source videos to final output video.

{% highlight objectivec %} 
...

self.gpuMovieA = [[GPUImageMovie alloc] initWithURL:..];
self.gpuMovieFX = [[GPUImageMovie alloc] initWithURL:...];

...

self.movieWriter.shouldPassthroughAudio = YES;
self.gpuMovieA.audioEncodingTarget = self.movieWriter;
[self.gpuMovieA enableSynchronizedEncodingUsingMovieWriter:self.movieWriter];

...
{% endhighlight %} 	

So you want to write audio track of one of two source video to destination video, above code would works quite well.

For example, in above code we want to have audio of gpuMovieA video show up in final video. Then sometimes we found
that we need to merge two audio tracks in each source video into final output video.

There are some issues in github about audio writing : [Audio writing issues with GPUImageMovieWriter](https://github.com/BradLarson/GPUImage/issues/934) and [Merging of video and audio](https://github.com/BradLarson/GPUImage/issues/1223).

Someone in the issue mentioned with frustration:

> I gave up and wrote my own code. GPUImage is great but it has so many issues and the code is not very easy to read for openGL noobs like me.
> I learned more by writing it myself - all roads lead to rome, and all of GPUImage is basically based on a few examples out there on the net anyhow..


Well, Brad Larson has just commented to that request:

> There currently is no way to do this kind of audio mixing. Only one audio source is used at a time.

#Problem Breakdown

Merging video tracks does work but audio doens't is because the way how it works. For video tracks merging, there are two GPUImageMovie instances and each starts reading frames, uploading image buffer to GPU then grabbing the reference to rendered texture, passing to GPUImageMovieWriter instance. Then GPUImageMovieWriter bind references of two textures to chroma key shader's input sample textures, rendered it. Finally grabbing the rendered output texture and write it to output video.

However audio tracks works quite differently, as you couldn't mix two CMSampleBufferRef of audio track output. How about in the GPUImageMovieWriter we use AVMutableComposition to mix two audio tracks and output it as a source for asset writer to write it to final output video.


{% highlight objectivec %} 
- (void)startMixAudio{
     if(self.rawVideoPath){
         //start reading
         NSURL *audioURL = [NSURL fileURLWithPath:self.rawVideoPath];
         NSURL *audioURL2 = [[NSBundle mainBundle] URLForResource:@"BOOMi_Greet" withExtension:@"mp4"];
 
         AVURLAsset* audioAsset = [[AVURLAsset alloc]initWithURL:audioURL options:nil];
         AVURLAsset* audioAsset2 = [[AVURLAsset alloc]initWithURL:audioURL2 options:nil];
 
 
         AVMutableComposition* mixComposition = [AVMutableComposition composition];
 
         AVMutableCompositionTrack *compositionCommentaryTrack = [mixComposition addMutableTrackWithMediaType:AVMediaTypeAudio
                                                                                             preferredTrackID:kCMPersistentTrackID_Invalid];
         [compositionCommentaryTrack insertTimeRange:CMTimeRangeMake(kCMTimeZero, audioAsset.duration)
                                             ofTrack:[[audioAsset tracksWithMediaType:AVMediaTypeAudio] objectAtIndex:0]
                                              atTime:kCMTimeZero error:nil];
 
 
         AVMutableCompositionTrack *compositionAudioTrack = [mixComposition addMutableTrackWithMediaType:AVMediaTypeAudio
                                                                                        preferredTrackID:kCMPersistentTrackID_Invalid];
         [compositionAudioTrack insertTimeRange:CMTimeRangeMake(kCMTimeZero, audioAsset.duration)
                                        ofTrack:[[audioAsset2 tracksWithMediaType:AVMediaTypeAudio] objectAtIndex:0]
                                         atTime:kCMTimeZero error:nil];
 
 
 
 
         // --- video reader
 
         AVAssetReader *assetReader = [AVAssetReader assetReaderWithAsset:mixComposition error:nil];
 
 
         AVAssetReaderAudioMixOutput * assetReaderTrackOutput =
                 [[AVAssetReaderAudioMixOutput alloc] initWithAudioTracks:[mixComposition tracksWithMediaType:AVMediaTypeAudio]
                                                            audioSettings:nil];
 
 
 //        AVAssetTrack *assetTrack = [[mixComposition tracksWithMediaType:AVMediaTypeAudio] objectAtIndex:0];
 //        AVAssetReaderTrackOutput *assetReaderTrackOutput = [AVAssetReaderTrackOutput assetReaderTrackOutputWithTrack:assetTrack outputSettings:NULL];
         [assetReader addOutput:assetReaderTrackOutput];
         [assetReader startReading];
 
 
         [assetWriterAudioInput requestMediaDataWhenReadyOnQueue:movieWritingQueue usingBlock:^
         {
             NSLog(@"Asset Writer ready :%d", assetWriterAudioInput.readyForMoreMediaData);
 
             while (assetWriterAudioInput.readyForMoreMediaData & !audioEncodingIsFinished)
             {
                 CMSampleBufferRef nextBuffer;
 
                 if([assetReader status] == AVAssetReaderStatusReading && (nextBuffer = [assetReaderTrackOutput copyNextSampleBuffer]))
                 {
                     if (nextBuffer)
                     {
                         NSLog(@"append buffer NextBuffer");
                         [assetWriterAudioInput appendSampleBuffer:nextBuffer];
                     }
                 }
 
                 else
                 {
                     NSLog(@"audio wrint done");
                     audioEncodingIsFinished = YES;
                     [assetWriterAudioInput markAsFinished];
                 }
             }
         }];
     }
 
  }
 {% endhighlight %} 	


To see more details on this , you can check my commit on github: [Writing Two Audio Tracks](https://github.com/tuo/GPUImage/commit/94dd95a650e076dd5c5a4e1be5e01020acd44928)
