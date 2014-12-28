---
layout: post
title: "Video Merging with AVFoundation and OpenGL ES on iOS: Alpha Channel"
date: 2014-12-28 22:05:17 +0800
published: true
tags: #tags go here: space-separated string
---

In one of previous post [Pixel Perfect Chroma Key Blend Using GPUImage](http://tuohuang.info/pixel-perfect-chroma-key-blend-using-gpuimage/), I have used GPUImage to achieve pixel perfect video blending using alpha channel. But what I did mention is that its performance is not quite stable, and I got run into lots of "problem with pixel appending" logs many times, the final video just doesn't look right. So I decide to expand my previous code a little to add support for three videoes merging just like GPUImage. And from my experiment,final video looks very perfect comparing to GPUImage. You could see the different on final output vidoes [here](https://github.com/tuo/AVFoundationOpenGLESVideoProcessing/tree/master/ThreeVidoes-AlphaChannelBlend/result_compare).

Here is one screenshot of one frame from final video using GPUImage on iPad2:


<div style="text-align:center; width:400px;height:483px; margin:0 auto" markdown="1">
![ipad2 gpualphablend framenotsynced](https://cloud.githubusercontent.com/assets/491610/5564000/48a1cf26-8edd-11e4-97ed-f8809269acf9.PNG)
</div> 

You could clearly tell that the frame is not perfectly synced.

Here is the one from my implementation:

<div style="text-align:center; width:400px;height:483px; margin:0 auto" markdown="1">
![ipad2 customblend png](https://cloud.githubusercontent.com/assets/491610/5563999/4641740c-8edd-11e4-8bfc-0270c4e90cb3.PNG)
</div> 

Note: the complete code is on github: [ThreeVidoes-AlphaChannelBlend/](https://github.com/tuo/AVFoundationOpenGLESVideoProcessing/tree/master/ThreeVidoes-AlphaChannelBlend). In sample code, I have also implemented how to do chroma key using GPUImage, so that you could compare side by side.  


Talk is cheap, show me the damn code.

#### Shaders

Now we need to change vertext shader to has three input texture coordinates:

    attribute vec4 Position;

    attribute vec2 srcTexCoordIn1;
    attribute vec2 srcTexCoordIn2;
    attribute vec2 srcTexCoordIn3;
    varying vec2 srcTexCoordOut1;
    varying vec2 srcTexCoordOut2;
    varying vec2 srcTexCoordOut3;

    void main(void) {
        gl_Position = Position;
        srcTexCoordOut1 = srcTexCoordIn1;
        srcTexCoordOut2 = srcTexCoordIn2;
        srcTexCoordOut3 = srcTexCoordIn3;
    }    

The fragment shader is quite simple, as we pull the color component from alpha channel video and use it as blend value:

    precision highp float;

    varying lowp vec2 srcTexCoordOut1;  //alpha
    uniform sampler2D srcTexture1; 

    varying lowp vec2 srcTexCoordOut2;  //fx
    uniform sampler2D srcTexture2;  

    varying lowp vec2 srcTexCoordOut3;  //raw/src
    uniform sampler2D srcTexture3;  

    uniform float thresholdSensitivity;
    uniform float smoothing;
    uniform vec3 colorToReplace;

    void main(void) {
        vec4 textureColorAlpha = texture2D(srcTexture1, srcTexCoordOut1);//alpha
        vec4 textureColorFX = texture2D(srcTexture2, srcTexCoordOut2); //fx
        vec4 textureColorSrc = texture2D(srcTexture3, srcTexCoordOut3); //src

        gl_FragColor = mix(textureColorFX, textureColorSrc, 1.0 -textureColorAlpha.r);

    }
    

### Sample 

{% highlight objectivec %}

fxURL = [[NSBundle mainBundle] URLForResource:@"fireworks_sd" withExtension:@"mp4"];
alphaURL = [[NSBundle mainBundle] URLForResource:@"fireworks_alpha_sd" withExtension:@"mp4"];
rawURL = [[NSBundle mainBundle] URLForResource:@"video" withExtension:@"mov"];


videoWriter = [[VideoWriter alloc] init];
videoReaderAlpha = [[VideoReader alloc] initWithURL:alphaURL];
videoReaderFX = [[VideoReader alloc] initWithURL:fxURL];
videoReaderRaw = [[VideoReader alloc] initWithURL:rawURL];

videoWriter.readerAlpha = videoReaderAlpha;
videoWriter.readerRaw = videoReaderRaw;
videoWriter.readerFX = videoReaderFX;

[videoReaderAlpha startProcessing];
[videoReaderRaw startProcessing];
[videoReaderFX startProcessing];
[videoWriter startRecording];

{% endhighlight %} 	


Okay, we're good with sample code, so what change we need on video reader and writer ?

Yeah, it turns out it is like what we did in two video merging: video reader doesn't need any change and we only need to change VideoWriter to add support for three readers.

### VideoWriter

First, we need to change **- (void)compileShaders ** method to get handler for third texture(because of one more video).

{% highlight objectivec %}

    _positionSlot = glGetAttribLocation(_program, "Position");
    _srcTexCoord1Slot = glGetAttribLocation(_program, "srcTexCoordIn1");
    _srcTexCoord2Slot = glGetAttribLocation(_program, "srcTexCoordIn2");
    _srcTexCoord3Slot = glGetAttribLocation(_program, "srcTexCoordIn3");

    glEnableVertexAttribArray(_positionSlot);
    glEnableVertexAttribArray(_srcTexCoord1Slot);
    glEnableVertexAttribArray(_srcTexCoord2Slot);
    glEnableVertexAttribArray(_srcTexCoord3Slot);

    _thresholdUniform = glGetUniformLocation(_program, "thresholdSensitivity");
    _smoothingUniform = glGetUniformLocation(_program, "smoothing");
    _colorToReplaceUniform = glGetUniformLocation(_program, "colorToReplace");

    _srcTexture1Uniform = glGetUniformLocation(_program, "srcTexture1");
    _srcTexture2Uniform = glGetUniformLocation(_program, "srcTexture2");
    _srcTexture3Uniform = glGetUniformLocation(_program, "srcTexture3");
    
{% endhighlight %} 


For **kickoffRecording**, it is quite simple now: 


{% highlight objectivec %}
- (void)kickoffRecording {
    [self.assetWriterVideoInput requestMediaDataWhenReadyOnQueue:UTIL.rwVideoSerializationQueue usingBlock:^{
        BOOL completedOrFailed = NO;
        // If the task isn't complete yet, make sure that the input is actually ready for more media data.
        while ([self.assetWriterVideoInput isReadyForMoreMediaData] && !completedOrFailed)
        {
            // Get the next video sample buffer, and append it to the output file.
            dispatch_group_t downloadGroup = dispatch_group_create(); // 2

            __block FrameRenderOutput *alphaFrameOutput;
            dispatch_group_async(downloadGroup, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0), ^{
                alphaFrameOutput = [self.readerAlpha renderNextFrame];
            });

            __block FrameRenderOutput *fxFrameOutput;
            dispatch_group_async(downloadGroup, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0), ^{
                fxFrameOutput = [self.readerFX renderNextFrame];
            });

            __block FrameRenderOutput *rawFrameOutput;
            dispatch_group_async(downloadGroup, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0), ^{
                rawFrameOutput = [self.readerRaw renderNextFrame];
            });



            NSLog(@"wait is starting");
            dispatch_group_wait(downloadGroup, DISPATCH_TIME_FOREVER); // 5
            NSLog(@"wait is done");
            if(!fxFrameOutput.sampleBuffer || !rawFrameOutput.sampleBuffer || !alphaFrameOutput.sampleBuffer){
                //reading done
                completedOrFailed = YES;
            } else {
                NSLog(@"------------ready-------recevied both:%d", fxFrameOutput.outputTexture);

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
                glVertexAttribPointer(_srcTexCoord2Slot, 2, GL_FLOAT, 0, 0, textureCoordinates);
                glVertexAttribPointer(_srcTexCoord3Slot, 2, GL_FLOAT, 0, 0, textureCoordinates);

                //bind uniforms
                glUniform1f(_thresholdUniform, 0.4f);
                glUniform1f(_smoothingUniform, 0.1f);

                Vector3 colorToReplaceVec3 = {0.0f, 1.0f, 0.0f};
                glUniform3fv(_colorToReplaceUniform, 1, (GLfloat *)&colorToReplaceVec3);

                glActiveTexture(GL_TEXTURE2);
                glBindTexture(GL_TEXTURE_2D, alphaFrameOutput.outputTexture);
                glUniform1i(_srcTexture1Uniform, 2);

                glActiveTexture(GL_TEXTURE3);
                glBindTexture(GL_TEXTURE_2D, fxFrameOutput.outputTexture);
                glUniform1i(_srcTexture2Uniform, 3);

                glActiveTexture(GL_TEXTURE4);
                glBindTexture(GL_TEXTURE_2D, rawFrameOutput.outputTexture);
                glUniform1i(_srcTexture3Uniform, 4);

                glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
                glFinish();

                CMTime frameTime = fxFrameOutput.frameTime;

                if(CMTimeCompare(frameTime, lastFrameTime) == NSOrderedSame){
                    NSLog(@"***********************FATAL ERROR, frame times are same");
                }

                //CVPixelBufferLockBaseAddress(_pixelBuffer, 0);

                BOOL writeSucceeded = [self.assetWriterPixelBufferInput appendPixelBuffer:_pixelBuffer withPresentationTime:frameTime];

                CVPixelBufferUnlockBaseAddress(_pixelBuffer, 0);

                if(writeSucceeded){
                    NSLog(@"==================dWrote a video frame: %@", CFBridgingRelease(CMTimeCopyDescription(kCFAllocatorDefault, frameTime)));
                    lastFrameTime = frameTime;
                }else{
                    //  NSLog(@"pixel buffer pool : %@", assetWriterPixelBufferInput.pixelBufferPool);
                    NSLog(@"Problem appending pixel buffer at time: %@ with error: %@", CFBridgingRelease(CMTimeCopyDescription(kCFAllocatorDefault, frameTime)), self.assetWriter.error);
                    lastFrameTime = frameTime;

                }
                [self.readerAlpha cleanupResource:alphaFrameOutput];
                [self.readerFX cleanupResource:fxFrameOutput];
                [self.readerRaw cleanupResource:rawFrameOutput];
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


Here we used **dispatch_group_async** to dispatch reading/uploading frame currently to get better performance as what we did in two video merging. After three frames rendered, then we pass it to our shader program, you have to pay attention to this code part:

                glActiveTexture(GL_TEXTURE2);
                glBindTexture(GL_TEXTURE_2D, alphaFrameOutput.outputTexture);
                glUniform1i(_srcTexture1Uniform, 2);

                glActiveTexture(GL_TEXTURE3);
                glBindTexture(GL_TEXTURE_2D, fxFrameOutput.outputTexture);
                glUniform1i(_srcTexture2Uniform, 3);

                glActiveTexture(GL_TEXTURE4);
                glBindTexture(GL_TEXTURE_2D, rawFrameOutput.outputTexture);
                glUniform1i(_srcTexture3Uniform, 4);
                
                
Again, the order is very important.

That's it, that's all you need to change to make it support three video merging to pixel perfect chroma key blending :)

    