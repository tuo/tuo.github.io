---
layout: post
title: "Video Merging with AVFoundation and OpenGL ES on iOS: Chroma Key"
date: 2014-12-28 21:27:57 +0800
published: true
tags: #tags go here: space-separated string
---

The goal of this article is to take a input video(e.g. green background video), and a raw video, then blend fx video over raw video by masking out green background color, which is also called chroma key. 

To achieve this, we need to modify the code that we had for one video transform little bit.

Note: the complete code is on github: [TwoVideoes-ChromaKey](https://github.com/tuo/AVFoundationOpenGLESVideoProcessing/tree/master/TwoVideoes-ChromaKey). In sample code, I have also implemented how to do chroma key using GPUImage, so that you could compare side by side.


#Shaders
<hr/>


Now we need to change vertext shader to has two input texture coordinates:

    attribute vec4 Position;

    attribute vec2 srcTexCoordIn1;
    attribute vec2 srcTexCoordIn2;
    varying vec2 srcTexCoordOut1;
    varying vec2 srcTexCoordOut2;

    void main(void) {
        gl_Position = Position;
        srcTexCoordOut1 = srcTexCoordIn1;
        srcTexCoordOut2 = srcTexCoordIn2;
    }

The fragment shader we take from GPUImage's [GPUImageChromaKeyBlendFilter](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageChromaKeyBlendFilter.m#L38):


    precision highp float;

    varying lowp vec2 srcTexCoordOut1; // Raw
    uniform sampler2D srcTexture1; // Raw

    varying lowp vec2 srcTexCoordOut2; // FX
    uniform sampler2D srcTexture2; // FX

    uniform float thresholdSensitivity;
    uniform float smoothing;
    uniform vec3 colorToReplace;

    void main(void) { 
        vec4 textureColor = texture2D(srcTexture1, srcTexCoordOut1); //raw     
        vec4 textureColor1 = texture2D(srcTexture2, srcTexCoordOut2); //fx

        float maskY = 0.2989 * colorToReplace.r + 0.5866 * colorToReplace.g + 0.1145 * colorToReplace.b;
        float maskCr = 0.7132 * (colorToReplace.r - maskY);
        float maskCb = 0.5647 * (colorToReplace.b - maskY);

        float Y = 0.2989 * textureColor.r + 0.5866 * textureColor.g + 0.1145 * textureColor.b;
        float Cr = 0.7132 * (textureColor.r - Y);
        float Cb = 0.5647 * (textureColor.b - Y);

        //     float blendValue = 1.0 - smoothstep(thresholdSensitivity - smoothing, thresholdSensitivity , abs(Cr - maskCr) + abs(Cb - maskCb));
        float blendValue = 1.0 - smoothstep(thresholdSensitivity, thresholdSensitivity + smoothing, distance(vec2(Cr, Cb), vec2(maskCr, maskCb)));
        //gl_FragColor = textureColor; //set it red for testing
        gl_FragColor = mix(textureColor, textureColor1, blendValue);

    }
    

So for anyone who has used GPUImage to do chromakey blend, this should look very familiar.

# Setup 
<hr/>


{% highlight objectivec %}

rawURL = [[NSBundle mainBundle] URLForResource:@"video" withExtension:@"mov"];
fxURL = [[NSBundle mainBundle] URLForResource:@"FXSample" withExtension:@"mov"];

videoWriter = [[VideoWriter alloc] init];
videoReaderRaw = [[VideoReader alloc] initWithURL:rawURL];
videoReaderFX = [[VideoReader alloc] initWithURL:fxURL];

videoWriter.readerRaw = videoReaderRaw;
videoWriter.readerFX = videoReaderFX;

[videoReaderRaw startProcessing];
[videoReaderFX startProcessing];
[videoWriter startRecording];

{% endhighlight %} 	


Okay, we're good with sample code, so what change we need on video reader and writer ?

Well, it turns out video reader doesn't need any change. We only need to change VideoWriter to add support for two readers.

# VideoWriter
<hr/>


First, we need to change **- (void)compileShaders ** method to get handler for second texture(because of one more video).

{% highlight objectivec %}

    _positionSlot = glGetAttribLocation(_program, "Position");
    _srcTexCoord1Slot = glGetAttribLocation(_program, "srcTexCoordIn1");
    _srcTexCoord2Slot = glGetAttribLocation(_program, "srcTexCoordIn2");

    glEnableVertexAttribArray(_positionSlot);
    glEnableVertexAttribArray(_srcTexCoord1Slot);
    glEnableVertexAttribArray(_srcTexCoord2Slot);

    _thresholdUniform = glGetUniformLocation(_program, "thresholdSensitivity");
    _smoothingUniform = glGetUniformLocation(_program, "smoothing");
    _colorToReplaceUniform = glGetUniformLocation(_program, "colorToReplace");

    _srcTexture1Uniform = glGetUniformLocation(_program, "srcTexture1");
    _srcTexture2Uniform = glGetUniformLocation(_program, "srcTexture2");
    
{% endhighlight %} 


Cool, so the setup is okay, let's move to most important part: **kickoffRecording**.


{% highlight objectivec %}
- (void)kickoffRecording {
    [self.assetWriterVideoInput requestMediaDataWhenReadyOnQueue:UTIL.rwVideoSerializationQueue usingBlock:^{
        BOOL completedOrFailed = NO;
        // If the task isn't complete yet, make sure that the input is actually ready for more media data.
        while ([self.assetWriterVideoInput isReadyForMoreMediaData] && !completedOrFailed)
        {
            // Get the next video sample buffer, and append it to the output file.
            dispatch_group_t downloadGroup = dispatch_group_create(); // 2

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
            if(!fxFrameOutput.sampleBuffer || !rawFrameOutput.sampleBuffer){
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

                //bind uniforms
                glUniform1f(_thresholdUniform, 0.4f);
                glUniform1f(_smoothingUniform, 0.1f);

                Vector3 colorToReplaceVec3 = {0.0f, 1.0f, 0.0f};
                glUniform3fv(_colorToReplaceUniform, 1, (GLfloat *)&colorToReplaceVec3);

                glActiveTexture(GL_TEXTURE2);
                glBindTexture(GL_TEXTURE_2D, rawFrameOutput.outputTexture);
                glUniform1i(_srcTexture1Uniform, 2);

                glActiveTexture(GL_TEXTURE3);
                glBindTexture(GL_TEXTURE_2D, fxFrameOutput.outputTexture);
                glUniform1i(_srcTexture2Uniform, 3);

                glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
                glFinish();

                CMTime frameTime = fxFrameOutput.frameTime;

                if(CMTimeCompare(frameTime, lastFrameTime) == NSOrderedSame){
                    NSLog(@"***********************FATAL ERROR, frame times are same");
                }

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


Here we used **dispatch_group_async** to dispatch reading/uploading frame currently to get better performance. After both frames rendered, then we pass it to our shader program, you have to pay attention to this code part:

                glActiveTexture(GL_TEXTURE2);
                glBindTexture(GL_TEXTURE_2D, rawFrameOutput.outputTexture);
                glUniform1i(_srcTexture1Uniform, 2);

                glActiveTexture(GL_TEXTURE3);
                glBindTexture(GL_TEXTURE_2D, fxFrameOutput.outputTexture);
                glUniform1i(_srcTexture2Uniform, 3);
                
                
The order is very important, as it is mapped to the order we defined in our shader, which could lead to completely different result if it is wrong.

That's it, that's all you need to change to make it support two video merging with chroma key.  


# What's Next
<hr/>


* ####[Audio Tracks Merge](http://tuohuang.info/video-merging-with-avfoundation-and-opengl-es-on-ios--multiple-audio-tracks-merge)####: We already have video merged, but not for audio part. So in next article, we will add function to merge audio tracks from all vidoes: .

* ####[Performance Optimization](http://tuohuang.info/video-merging-with-avfoundation-and-opengl-es-on-ios--optimization-with-instruments/)####: All above test is based on 640*640 resolution, what if we try 1280*720 resolution videos?  We will try to use OpenGL ES Analyzer in Instrument to help improve the performance.


    
