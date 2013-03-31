---
layout: post
title: "Android上setAlpha诡异问题"
date: 2013-03-14 13:18:35 +0800
published: true
tags: 
- android #tags go here: space-separated string
---

当有一次需要在imageView上使用setAlpha来改变当前view的透明度时，发现一个很2的问题.


	float opacity = (float) (1.0 - ((float)currentTime/1000.0 - spot.originalStartTime)/FADE_OUT_DURATION);
	imageView.setAlpha((int)(255.0*opacity));
	

在调试中发现，本应该这个imageView的alpha从1(完全不透明)降到0(透明)，然后以后整个imageView应该就看不到了消失掉.

但是却发现imageView是从不透明到透明然后又从透明变回不透明。 这个甚是奇怪，因为这段代码在iOS上是木有问题的.

回头想了想，猜测可能是当opacity为负值时，android认为它跟正值一样，所以它显示为不透明了.

实验了一下，确实发现这个问题，opacity为负值时，它的最终表现是跟正值一样的. 吐血了 :(

所以又改了改代码

	float opacity = (float) (1.0 - ((float)currentTime/1000.0 - spot.originalStartTime)/FADE_OUT_DURATION);
	if(opacity < 0)opacity = 0;
	hview.setAlpha((int)(255.0*opacity));	
	

终于正常了
