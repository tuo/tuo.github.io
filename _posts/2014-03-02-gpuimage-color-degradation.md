---
layout: post
title: "GPUImage Photo(Still)/Video - Color Degradation/Too Much Brightness"
date: 2014-03-02 13:29:59 +0800
tags: GPUImage,Chroma Key
---

I have mentioned this problem before in my previous post [GPUImage Movie Writer Exposure Problem](http://tuohuang.info/gpuimage_movie_writer_exposure_problem).

I thought I have solved problem but still the color rendered in GPUImageView is weird - it doesn't look that much nature. I re-examine the change and find there is some sample code called [GLCameraRipple](https://developer.apple.com/library/ios/samplecode/GLCameraRipple/Introduction/Intro.html) from Apple which pretty much does same thing - color conversion from YUV to RGB.

After I download and check the code in GLCameraRipple, I find that actually the shader is pretty much the same. I changed the shader string to what I mentioned in [GPUImage Movie Writer Exposure Problem](http://tuohuang.info/gpuimage_movie_writer_exposure_problem), tried it out but the rendered image still isn't right. 

Then I trace from shader string down to the configurations/settings of the OpenGL ES, more specifically the texture uploading. 

Here are the code in GPUImageVideoCamera.m: 

{% highlight objectivec %} 
// Y-plane
glActiveTexture(GL_TEXTURE4);
if ([GPUImageContext deviceSupportsRedTextures])
{
//                err = CVOpenGLESTextureCacheCreateTextureFromImage(kCFAllocatorDefault, coreVideoTextureCache, cameraFrame, NULL, GL_TEXTURE_2D, GL_RED_EXT, bufferWidth, bufferHeight, GL_RED_EXT, GL_UNSIGNED_BYTE, 0, &luminanceTextureRef);
    err = CVOpenGLESTextureCacheCreateTextureFromImage(kCFAllocatorDefault, coreVideoTextureCache, cameraFrame, NULL, GL_TEXTURE_2D, GL_LUMINANCE, bufferWidth, bufferHeight, GL_LUMINANCE, GL_UNSIGNED_BYTE, 0, &luminanceTextureRef);
}
else
{
    err = CVOpenGLESTextureCacheCreateTextureFromImage(kCFAllocatorDefault, coreVideoTextureCache, cameraFrame, NULL, GL_TEXTURE_2D, GL_LUMINANCE, bufferWidth, bufferHeight, GL_LUMINANCE, GL_UNSIGNED_BYTE, 0, &luminanceTextureRef);
}
{% endhighlight %} 	

You would probably wonder why those two code in both branches is the same.As you see, the only difference is that **GL_RED_EXT** vs **GL_LUMINANCE**. Then I'm curious about which value is used in apple's sample code. 

Open file [RippleViewController.m](https://developer.apple.com/library/ios/samplecode/GLCameraRipple/Listings/GLCameraRipple_RippleViewController_m.html#//apple_ref/doc/uid/DTS40011222-GLCameraRipple_RippleViewController_m-DontLinkElementID_8), scroll down then you can see the following code snippet:

{% highlight objectivec %} 
// CVOpenGLESTextureCacheCreateTextureFromImage will create GLES texture
// optimally from CVImageBufferRef.

// Y-plane
glActiveTexture(GL_TEXTURE0);
err = CVOpenGLESTextureCacheCreateTextureFromImage(kCFAllocatorDefault, 
                                                   _videoTextureCache,
                                                   pixelBuffer,
                                                   NULL,
                                                   GL_TEXTURE_2D,
                                                   GL_RED_EXT,
                                                   _textureWidth,
                                                   _textureHeight,
                                                   GL_RED_EXT,
                                                   GL_UNSIGNED_BYTE,
                                                   0,
                                                   &_lumaTexture);
if (err) 
{
    NSLog(@"Error at CVOpenGLESTextureCacheCreateTextureFromImage %d", err);
}   

{% endhighlight %}

So the shader string is much the same, well the texture uploading settings is different. I tried to change all the settings in [GPUImageVideoCamera.m](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageVideoCamera.m) and [GPUImageMovie.m](https://github.com/BradLarson/GPUImage/blob/master/framework/Source/GPUImageMovie.m).

Now run the app again, compare the image with previous one, this time it looks fine.

The complete code change is in this commit: [fix color degradation](https://github.com/tuo/GPUImage/commit/5176663ee22dd3e04e0a593247453f84565263fc).



