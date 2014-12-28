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

Also you could find/download/run the sample project/code in github: [AVFoundationOpenGLESVideoProcessing: OneVideo](https://github.com/tuo/AVFoundationOpenGLESVideoProcessing/tree/master/OneVideo)

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

### Sample 

{% highlight objectivec %}

fxURL = [[NSBundle mainBundle] URLForResource:@"FXSample" withExtension:@"mov"];
videoWriter = [[VideoWriter alloc] init];
videoReaderFX = [[VideoReader alloc] initWithURL:fxURL];

[videoReaderFX startProcessing];
[videoWriter startRecording];

{% endhighlight %} 	

### Video Reader Setup

setup code:

{% highlight objectivec %}

- (id)initWithURL:(NSURL *)pUrl{
    self = [super init]; 
    if (self) {
        self.url = pUrl;       
        [self setupOpenGLESTextureCache];
    }
    return self;
}


- (void)setupOpenGLESTextureCache {
    // Create a new CVOpenGLESTexture cache
    //-- Create CVOpenGLESTextureCacheRef for optimal CVImageBufferRef to GLES texture conversion.
#if COREVIDEO_USE_EAGLCONTEXT_CLASS_IN_API
    CVReturn err = CVOpenGLESTextureCacheCreate(kCFAllocatorDefault, NULL, [ContextManager shared].currentContext, NULL, &coreVideoTextureCache);
#else
        CVReturn err = CVOpenGLESTextureCacheCreate(kCFAllocatorDefault, NULL, (__bridge void *)([ContextManager shared].currentContext), NULL, &coreVideoTextureCache);
    #endif
    if (err) {
        NSLog(@"Error at CVOpenGLESTextureCacheCreate %d", err);
        exit(1);
    }
}

{% endhighlight %} 	

Load video and prepare:

{% highlight objectivec %}
- (void)setupAssetReader {
   
    NSError* error;
    self.assetReader = [AVAssetReader assetReaderWithAsset:self.asset error:&error];
    NSParameterAssert(self.assetReader);


    NSDictionary *outputSettings = @{
            (id)kCVPixelBufferPixelFormatTypeKey : @(kCVPixelFormatType_32BGRA)
    };

    NSArray *videoTracks = [self.asset tracksWithMediaType:AVMediaTypeVideo];
    AVAssetTrack *videoTrack = [videoTracks objectAtIndex:0];

    self.assetReaderOutput = [AVAssetReaderTrackOutput assetReaderTrackOutputWithTrack:videoTrack
                                                                     outputSettings:outputSettings];

    NSParameterAssert(self.assetReaderOutput);
    NSParameterAssert([self.assetReader canAddOutput:self.assetReaderOutput]);
    [self.assetReader addOutput:self.assetReaderOutput];
    
}

- (void)startAssetReader {
    __weak typeof(self) weakSelf = self;
    if (![self.assetReader startReading])
    {
        NSLog(@"Error reading from file at URL: %@", self.url);
        return;
    }

    NSLog(@"asset %@ is good to read...", self.url);
}


- (void)startProcessing{
    dispatch_group_enter(UTIL.dispatchGroup);
    self.asset = [AVAsset assetWithURL:_url];
    CMTime duration = self.asset.duration;
    CGFloat durationInSeconds = (CGFloat) CMTimeGetSeconds(duration);
    __weak typeof(self) weakSelf = self;
    [self.asset loadValuesAsynchronouslyForKeys:@[@"tracks"] completionHandler:^{
        // Once the tracks have finished loading, dispatch the work to the main serialization queue.
        dispatch_async(UTIL.mainSerializationQueue, ^{
            BOOL success = YES;
            NSError *localError = nil;
            // Check for success of loading the assets tracks.
            success = ([self.asset statusOfValueForKey:@"tracks" error:&localError] == AVKeyValueStatusLoaded);
            if (success)
            {
            }
            if (success){
                [self setupAssetReader];
            }
            if (success){
                [self startAssetReader];
            }

            dispatch_group_leave(UTIL.dispatchGroup);
        });
    }];
}
{% endhighlight %} 


### Video Writer Setup

Note: video writer setup and warm up is more complicted than reader slightly.

First part is setup code:

{% highlight objectivec %}

- (void)setup {

    self.videoSize = CGSizeMake(640, 640);
    [self setupOpenGLESTextureCache];
    [self compileShaders];
}

- (void)setupOpenGLESTextureCache {
    // Create a new CVOpenGLESTexture cache
    //-- Create CVOpenGLESTextureCacheRef for optimal CVImageBufferRef to GLES texture conversion.
#if COREVIDEO_USE_EAGLCONTEXT_CLASS_IN_API
    CVReturn err = CVOpenGLESTextureCacheCreate(kCFAllocatorDefault, NULL, [ContextManager shared].currentContext, NULL, &_textureCache);
#else
        CVReturn err = CVOpenGLESTextureCacheCreate(kCFAllocatorDefault, NULL, (__bridge void *)([ContextManager shared].currentContext), NULL, &_textureCache);
    #endif
    if (err) {
        NSLog(@"Error at CVOpenGLESTextureCacheCreate %d", err);
        exit(1);
    }
}


- (void)compileShaders {

    // 1
    GLuint vertexShader = [self compileShader:VERTEX_SHADER_FILENAME withType:GL_VERTEX_SHADER];
    GLuint fragmentShader = [self compileShader:FRAGMENT_SHADER_FILENAME withType:GL_FRAGMENT_SHADER];

    // 2
    _program = glCreateProgram();
    glAttachShader(_program, vertexShader);
    glAttachShader(_program, fragmentShader);
    glLinkProgram(_program);

    // 3
    GLint linkSuccess;
    glGetProgramiv(_program, GL_LINK_STATUS, &linkSuccess);
    if (linkSuccess == GL_FALSE) {
        GLchar messages[256];
        glGetProgramInfoLog(_program, sizeof(messages), 0, &messages[0]);
        NSString *messageString = [NSString stringWithUTF8String:messages];
        NSLog(@"%@", messageString);
        exit(1);
    }


    // 4
    _positionSlot = glGetAttribLocation(_program, "Position");
    _srcTexCoord1Slot = glGetAttribLocation(_program, "srcTexCoordIn1");

    glEnableVertexAttribArray(_positionSlot);
    glEnableVertexAttribArray(_srcTexCoord1Slot);

    _thresholdUniform = glGetUniformLocation(_program, "thresholdSensitivity");
    _smoothingUniform = glGetUniformLocation(_program, "smoothing");
    _colorToReplaceUniform = glGetUniformLocation(_program, "colorToReplace");

    _srcTexture1Uniform = glGetUniformLocation(_program, "srcTexture1");
}

- (GLuint)compileShader:(NSString*)shaderName withType:(GLenum)shaderType {
    //... 
}
  
{% endhighlight %} 

First part is setup code:

{% highlight objectivec %}
- (void)setupAssetWriter {
    // Do any additional setup after loading the view.
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentsDirectory = [paths objectAtIndex:0];
//    NSString *myPathDocs =  [documentsDirectory stringByAppendingPathComponent:@"merge-output.mov"];
    NSString *myPathDocs =  [documentsDirectory stringByAppendingPathComponent:
            [NSString stringWithFormat:@"merge-output-%d.mov",arc4random() % 1000]];
    self.outputURL = [NSURL fileURLWithPath:myPathDocs];

    // If the tracks loaded successfully, make sure that no file exists at the output path for the asset writer.
    NSFileManager *fm = [NSFileManager defaultManager];
    NSString *localOutputPath = [self.outputURL path];
    if ([fm fileExistsAtPath:localOutputPath]){
        [fm removeItemAtPath:localOutputPath error:nil];
    }

    NSLog(@"setupAssetWriter outputURL: %@", self.outputURL );

    self.movieWritingQueue = dispatch_queue_create("tuo.test.movieWritingQueue", NULL);


    NSError *error;
    self.assetWriter = [AVAssetWriter assetWriterWithURL:self.outputURL
                                                fileType:AVFileTypeQuickTimeMovie error:&error];

    NSParameterAssert(self.assetWriter);



    NSDictionary *videoSettings = @{
            AVVideoCodecKey : AVVideoCodecH264,
            AVVideoWidthKey : @(self.videoSize.width),
            AVVideoHeightKey : @(self.videoSize.height)
    };
    self.assetWriterVideoInput =  [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo
                                                                     outputSettings:videoSettings];
    // You need to use BGRA for the video in order to get realtime encoding. I use a color-swizzling shader to line up glReadPixels' normal RGBA output with the movie input's BGRA.
    NSDictionary *sourcePixelBufferAttributesDictionary = [NSDictionary dictionaryWithObjectsAndKeys: [NSNumber numberWithInt:kCVPixelFormatType_32BGRA], kCVPixelBufferPixelFormatTypeKey,
                                                                                                      [NSNumber numberWithInt:self.videoSize.width], kCVPixelBufferWidthKey,
                                                                                                      [NSNumber numberWithInt:self.videoSize.height], kCVPixelBufferHeightKey,
                    nil];

    self.assetWriterPixelBufferInput = [AVAssetWriterInputPixelBufferAdaptor assetWriterInputPixelBufferAdaptorWithAssetWriterInput:self.assetWriterVideoInput
                                                                                                        sourcePixelBufferAttributes:sourcePixelBufferAttributesDictionary];

    NSParameterAssert(self.assetWriterVideoInput);
    NSParameterAssert([self.assetWriter canAddInput:self.assetWriterVideoInput]);
    [self.assetWriter addInput:self.assetWriterVideoInput]; 
}

- (void)startAssetWriter {
    BOOL success = [self.assetWriter startWriting];
    if (!success){
        NSLog(@"asset write start writing failed: %@", self.assetWriter.error);
        return;
    }
    [self.assetWriter startSessionAtSourceTime:kCMTimeZero];
    NSLog(@"asset write is good to write...");
}

- (void)startRecording {
    dispatch_async(UTIL.mainSerializationQueue, ^{
        [self setupAssetWriter];
        [self startAssetWriter];

        // Set up the notification that the dispatch group will send when the audio and video work have both finished.
        dispatch_group_notify(UTIL.dispatchGroup, UTIL.mainSerializationQueue, ^{
            NSLog(@"all set, readers and writer both are ready");

            [self kickoffRecording];
        });
    });
}

{% endhighlight %} 

### Video Writer KickOff

This is key part of whole thing:

{% highlight objectivec %}
- (void)kickoffRecording {
    [self.assetWriterVideoInput requestMediaDataWhenReadyOnQueue:UTIL.rwVideoSerializationQueue usingBlock:^{
        BOOL completedOrFailed = NO;
        // If the task isn't complete yet, make sure that the input is actually ready for more media data.
        while ([self.assetWriterVideoInput isReadyForMoreMediaData] && !completedOrFailed)
        {

            FrameRenderOutput *fxFrameOutput = [self.readerFX renderNextFrame];

            if(!fxFrameOutput.sampleBuffer){
                //reading done
                completedOrFailed = YES;
            } else {

                CVPixelBufferLockBaseAddress(_pixelBuffer, 0);

                [[ContextManager shared] useCurrentContext];

                if(_frameBuffer == 0){
                    [self createFrameBufferObject];

                }
                glBindFramebuffer(GL_FRAMEBUFFER, _frameBuffer);

                glClearColor(0.0, 0.0, 0.0, 1.0);
                glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

                glViewport(0, 0, (int)self.videoSize.width, (int)self.videoSize.height);
                //use shader program
                NSAssert(_program, @"Program should be created");
                glUseProgram(_program);


                // This needs to be flipped to write out to video correctly
                static const GLfloat squareVertices[] = {
                        -1.0f, -1.0f,
                        1.0f, -1.0f,
                        -1.0f,  1.0f,
                        1.0f,  1.0f,
                };

                static const GLfloat textureCoordinates[] = {
                        0.0f, 0.0f,
                        1.0f, 0.0f,
                        0.0f, 1.0f,
                        1.0f, 1.0f,
                };
                glVertexAttribPointer(_positionSlot, 2, GL_FLOAT, 0, 0, squareVertices);
                glVertexAttribPointer(_srcTexCoord1Slot, 2, GL_FLOAT, 0, 0, textureCoordinates);

                //bind uniforms
                glUniform1f(_thresholdUniform, 0.4f);
                glUniform1f(_smoothingUniform, 0.1f);

                Vector3 colorToReplaceVec3 = {0.0f, 1.0f, 0.0f};
                glUniform3fv(_colorToReplaceUniform, 1, (GLfloat *)&colorToReplaceVec3);

                glActiveTexture(GL_TEXTURE2);
                glBindTexture(GL_TEXTURE_2D, fxFrameOutput.outputTexture);
                glUniform1i(_srcTexture1Uniform, 2);


                glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
                glFinish();
                
                CMTime frameTime = fxFrameOutput.frameTime;

                if(CMTimeCompare(frameTime, lastFrameTime) == NSOrderedSame){
                    NSLog(@"***********************FATAL ERROR, frame times are same");
                }

                BOOL writeSucceeded = [self.assetWriterPixelBufferInput appendPixelBuffer:_pixelBuffer withPresentationTime:frameTime];
                CVPixelBufferUnlockBaseAddress(_pixelBuffer, 0);
                if(writeSucceeded){
                    lastFrameTime = frameTime;
                }else{
                    NSLog(@"Problem appending pixel buffer at time: %@ with error: %@", CFBridgingRelease(CMTimeCopyDescription(kCFAllocatorDefault, frameTime)), self.assetWriter.error);

                }
                [self.readerFX cleanupResource:fxFrameOutput];
            }

        }
        if (completedOrFailed)
        {
            NSLog(@"mark as finish");
            // Mark the input as finished, but only if we haven't already done so, and then leave the dispatch group (since the video work has finished).
            [self.assetWriterVideoInput markAsFinished];
            [self.assetWriter finishWritingWithCompletionHandler:^{
                dispatch_async(dispatch_get_main_queue(), ^{
                    [SVProgressHUD showWithStatus:@"Write done"];
                    if(self.onWritingFinishedBlock){
                        self.onWritingFinishedBlock(self.outputURL);
                    }
                });
            }];
        }
    }];
}

{% endhighlight %} 

The **renderNextFrame** in video reader shows how to read frame and upload to GPU:

{% highlight objectivec %}
- (FrameRenderOutput *)renderNextFrame{

    CMSampleBufferRef sampleBuffer = [self.avReaderOutput copyNextSampleBuffer];
    NSLog(@"%@, sampleBuffer: %d, reader status: %d", self.url.lastPathComponent, sampleBuffer != nil, self.assetReader.status);

    if(sampleBuffer == nil){
        NSLog(@"%@ ----- reading done", self.url.lastPathComponent);
        FrameRenderOutput *frameRenderOutput = [[FrameRenderOutput alloc] init];
        frameRenderOutput.sampleBuffer = nil;
        return frameRenderOutput;
    }


    CMTime currentSampleTime = CMSampleBufferGetOutputPresentationTimeStamp(sampleBuffer);
    CVImageBufferRef movieFrame = CMSampleBufferGetImageBuffer(sampleBuffer);


    [[ContextManager shared] useCurrentContext];

    CVPixelBufferLockBaseAddress(movieFrame, 0);

    int bufferHeight = CVPixelBufferGetHeight(movieFrame);
    int bufferWidth = CVPixelBufferGetWidth(movieFrame);

    if(!framebuffer){
        glGenFramebuffers(1, &framebuffer);
        glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    }
    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);



    CVReturn err = CVOpenGLESTextureCacheCreateTextureFromImage(kCFAllocatorDefault,
            coreVideoTextureCache,
            movieFrame,
            NULL,
            GL_TEXTURE_2D,
            GL_RGBA,
            bufferWidth,
            bufferHeight,
            GL_BGRA,
            GL_UNSIGNED_BYTE,
            0,
            &texture);

    if (!texture || err) {
        NSLog(@"Movie CVOpenGLESTextureCacheCreateTextureFromImage failed (error: %d)", err);
        NSAssert(NO, @"Camera failure");
        return nil;
    }

    outputTexture = CVOpenGLESTextureGetName(texture);
    //        glBindTexture(CVOpenGLESTextureGetTarget(texture), outputTexture);
    glBindTexture(GL_TEXTURE_2D, outputTexture);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, CVOpenGLESTextureGetName(texture), 0);


    FrameRenderOutput *frameRenderOutput = [[FrameRenderOutput alloc] init];
    frameRenderOutput.outputTexture = outputTexture;
    frameRenderOutput.inputTexture = texture;
    frameRenderOutput.frameTime = currentSampleTime;
    frameRenderOutput.sampleBuffer = sampleBuffer;

    NSLog(@"%@, frameRenderOutput: %@", self.url.lastPathComponent, frameRenderOutput);
    return frameRenderOutput;
}

- (void)cleanupResource:(FrameRenderOutput *)output {
    CVOpenGLESTextureCacheFlush(coreVideoTextureCache, 0);
    CFRelease(texture);

    NSLog(@"clean up resources: %@", self.url.lastPathComponent);
    CMSampleBufferInvalidate(output.sampleBuffer);
    CFRelease(output.sampleBuffer);
    output.sampleBuffer = NULL;

    outputTexture = 0;

}
{% endhighlight %} 

FrameRenderOutput is just simply data object to hold some intermediate information about frame:

{% highlight objectivec %}
@interface FrameRenderOutput : NSObject

@property (nonatomic) GLuint outputTexture;
@property (nonatomic) CMTime frameTime;

@property(nonatomic) CMSampleBufferRef sampleBuffer;

@property(nonatomic) CVOpenGLESTextureRef inputTexture;

- (NSString *)description;


@end

{% endhighlight %} 

### Shader GLSL

Here is the vertext file:

    attribute vec4 Position;

    attribute vec2 srcTexCoordIn1;
    varying vec2 srcTexCoordOut1;

    void main(void) {
        gl_Position = Position;
        srcTexCoordOut1 = srcTexCoordIn1;
    }

very simple. And fragment shader is :

    precision highp float;

    varying lowp vec2 srcTexCoordOut1; // New
    uniform sampler2D srcTexture1; // New

    void main(void) {
        vec4 textureColor = texture2D(srcTexture1, srcTexCoordOut1); //movie fx video

        gl_FragColor = vec4(textureColor.r,0, textureColor.b, textureColor.a);

    }
    

That's it! Give it a run, you should be able to see final result.






