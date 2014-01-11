---
layout: post
title: "Unity GUI自适应屏幕分辨率（一）布局自适应"
date: 2014-01-11 14:21:51 +0800
tags: unity,gui,auto scale
---

在用Unity做游戏开发中，碰到一个头疼的问题就是如何设计自适应屏幕分辨率的GUI菜单。因为现在的屏幕尺寸太多，分辨率各个不一样，但是我们又不想为某一种具体的屏幕分辨率做特别的处理，有木有一种通用的方案来解决这个问题了？

我个人在开发的过程中碰到了不少这方面的问题，所以下面六个话题中一一阐述这些常见的问题，算是抛砖引玉吧。

	1. 坐标矩阵变化实现布局自适应
	2. 标清高清图片资源的加载
	3. Label高清实现（字体模糊问题）
	4. Scroll view的矩阵变化
	5. GUI Box vs DrawTexture
	6. GUI 全屏背景图片

这里我们先谈第一个问题坐标矩阵变化实现布局自适应。

## 选取基准尺寸

&nbsp;&nbsp;&nbsp;&nbsp;通常你需要选择一个基准的屏幕尺寸，象现在开发的应用也需要跨平台在iOS(iPhone/iPad)/Android都可以运行，我这边选取的是iphone4的屏幕尺寸: 480 * 320. 设计师设计的GUI的素材时就是按照这个尺寸来设计。但是紧接着的问题是如何保证它在其他不同尺寸/分辨率的平台上运行时不会出现各种诡异的位置大小错乱了。

举一个实际的例子来更好描述这个问题，比如我们的游戏是水平方向的， 然后游戏进行中间的暂停界面中，有三个角落有按钮或着标签，屏幕中间有一个按钮，如下图所示：


![Base Layout](http://farm3.staticflickr.com/2855/11882590563_b6d46ec541_o.png)


很简单的代码：

{% highlight csharp %} 
void OnGUI()
{

	GUI.Box(new Rect(15 , 10, 83, 49), bg_score);
	GUI.Box(new Rect(372, 10, 98, 44), bg_time);
	
	if (GUI.Button(new Rect(5, 280, 67, 41), bt_pause))
	{
		//pause the scene
	}

}
{% endhighlight %} 	

## 伸缩居中

&nbsp;&nbsp;&nbsp;&nbsp;在Unity中我们将Game窗口的模式选择为iPhone Wide(480x320)， 然后运行游戏， 木有什么问题。 紧接着尝试运行在iPhone 4G Wide(960x640)， 你就会发现问题了，整个格局错乱了，并没有有比例的伸缩，然后全部堆到了左边.

![Retina 960*640](http://farm4.staticflickr.com/3742/11882321135_7e91390817.jpg)

所以可以想到既然有了基准的屏幕尺寸，其他尺寸的处理必然需要针对这个基准来变化， 我们需要的是在基准屏幕上各个元素都按照一定的比例放大或者缩小，水平和竖直方向的伸缩比列一定得是同步的，这样一来保证它们之间的相对位置保持不变。在Unity中GUI系统中我们就需要运用到GUI.Matrix矩阵变化。

要解决这个问题，我们可以定义一个基准尺寸，我们这里是480*320.

{% highlight csharp %} 
public static Vector2 NativeResolution  = new Vector2(480, 320);
{% endhighlight %} 	

然后了，我们要让长宽按照这个基准来变化，包括首先是伸缩放大或缩小，其次是在变化之后使其保持居中。

{% highlight csharp %} 
private static float _guiScaleFactor = -1.0f;
private static Vector3 _offset = Vector3.zero;
	
static List<Matrix4x4> stack = new List<Matrix4x4> ();
public void BeginUIResizing()
{
	Vector2 nativeSize = NativeResolution;
	
	_didResizeUI = true;
	
	stack.Add (GUI.matrix);
	Matrix4x4 m = new Matrix4x4();
	var w = (float)Screen.width;
	var h = (float)Screen.height;
	var aspect = w / h;
	var offset = Vector3.zero;
	if(aspect < (nativeSize.x/nativeSize.y)) 
	{ 
	//screen is taller
	    _guiScaleFactor = (Screen.width/nativeSize.x);
	    offset.y += (Screen.height-(nativeSize.y*guiScaleFactor))*0.5f;
	} 
	else 
	{ 
	// screen is wider
	    _guiScaleFactor = (Screen.height/nativeSize.y);
	    offset.x += (Screen.width-(nativeSize.x*guiScaleFactor))*0.5f;
	}
	
	m.SetTRS(offset,Quaternion.identity,Vector3.one*guiScaleFactor);
	GUI.matrix *= m;	
}

public void EndUIResizing()
{
	GUI.matrix = stack[stack.Count - 1];
	stack.RemoveAt (stack.Count - 1);
	_didResizeUI = false;
}
{% endhighlight %} 	

紧着这我们在OnGUI方法中的开头和结尾分别调用BeginUIResizing和EndUIResizing来变化矩阵。

{% highlight csharp %} 
void OnGUI()
{
	BeginUIResizing(); //call this in the beginning of method

	GUI.Box(new Rect(15 , 10, 83, 49), bg_score);
	GUI.Box(new Rect(372, 10, 98, 44), bg_time);
	
	if (GUI.Button(new Rect(5, 280, 67, 41), bt_pause))
	{
		//pause the scene
	}

	EndUIResizing(); //call this in the end of method
}
{% endhighlight %} 	

这里我们根据长宽比，算出伸缩比例，然后为了保证伸缩之后的画面能始终在屏幕中间，我们要算出多出来偏移量，最后我们根据这个偏移量和缩放比例对矩阵进行变化。

然后我们再在分辨率为960*640的情况下运行。

- iPhone4 960 * 640:

![Retina 960*640 Right Layout](http://farm6.staticflickr.com/5482/11882321365_dcd736250d_z.jpg)

- iPhone5 1136 * 640:

![iPhone5 1136*640 Wrong Layout](http://farm4.staticflickr.com/3706/11882747004_55b8a6cf7d_z.jpg)

- iPad 1024 * 768:

![iPad 1024*768 Wrong Layout](http://farm6.staticflickr.com/5476/11882746904_3a77e61fce_c.jpg)

你可以看到在其他尺寸的屏幕上伸缩都没有问题，而且元素都居中。但是有一个问题，你发现在iPhone5和iPad上几个标签按钮的位置有点不太对，他们需要像iPhone4一样紧贴两边，而在iPhone5和iPad上却不是这样。

## 偏移量

&nbsp;&nbsp;&nbsp;&nbsp;要想解决这个问题的理解这个矩阵变化是如何工作的。这个偏移量是变换之后算出来的偏移量。所以要想让GUI元素在变换之后依然在保持屏幕的边缘，我们需要将x,y减去这偏移量，于是有了下面的代码:

{% highlight csharp %} 
void OnGUI()
{
	BeginUIResizing(); //call this in the beginning of method

	GUI.Box(new Rect(15 - offset.x/guiScaleFactor , 10 - offset.y/guiScaleFactor,
	 	83, 49), bg_score);
	GUI.Box(new Rect(372 + offset.x/guiScaleFactor, 10 - offset.y/guiScaleFactor, 
		98, 44), bg_time);
	
	if (GUI.Button(new Rect(5 - offset.x/guiScaleFactor, 280 + offset.y/guiScaleFactor, 
		67, 41), bt_pause))
	{
		//pause the scene
	}

	EndUIResizing(); //call this in the end of method
}
{% endhighlight %} 	

这里要记住这个偏移量是offset.x/guiScaleFactor, 而不是offset.x， 因为这个坐标是基于基准矩阵来的。

将代码重新跑一遍：

- iPhone5 1136*640

![iPhone5 1136*640 Right Layout](http://farm3.staticflickr.com/2870/11882746984_4f2465a18b.jpg)

- iPad 1024 * 768:

![iPad 1024*768 Right Layout](http://farm4.staticflickr.com/3809/11883162066_fd1e0dfc3c_z.jpg)


这个木有问题了。

接下来我们就需要讨论加载标清高清图片的问题。