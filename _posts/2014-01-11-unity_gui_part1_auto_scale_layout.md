---
layout: post
title: "Unity GUI自适应屏幕分辨率（一）布局伸缩"
date: 2014-01-11 14:21:51 +0800
public: false
tags: unity,gui,auto scale
---

在用Unity做游戏开发中，碰到一个头疼的问题就是如何设计自适应屏幕分辨率的GUI菜单。因为现在的屏幕尺寸太多，分辨率各个不一样，但是我们又不想为某一种具体的屏幕分辨率做特别的处理，有木有一种通用的方案来解决这个问题了？

通常你需要选择一个基准的屏幕尺寸，象现在开发的应用也需要跨平台在iOS(iPhone/iPad)/Android都可以运行，我这边选取的是iphone4的屏幕尺寸: 480 * 320. 设计师设计的GUI的素材时就是按照这个尺寸来设计。但是紧接着的问题是如何保证它在其他不同尺寸/分辨率的平台上运行时不会出现各种诡异的位置大小错乱了。

##1. GUI等比缩放
既然有了基准的屏幕尺寸，其他尺寸的处理必然需要针对这个基准来变化， 我们需要的是在基准屏幕上各个元素都按照一定的比例放大或者缩小，水平和竖直方向的伸缩比列一定得是同步的，这样一来保证它们之间的相对位置保持不变。在Unity中GUI系统中我们就需要运用到GUI.Matrix矩阵变化。

举一个实际的例子来更好描述这个问题，比如我们的游戏是水平方向的， 然后游戏进行中间的暂停界面中，有三个角落有按钮或着标签，屏幕中间有一个按钮，如下图所示：



很简单的代码：

``` c#
void OnGUI()
{

	GUI.Box(new Rect(15 , 10, 83, 49), bg_score);
	GUI.Box(new Rect(372, 10, 98, 44), bg_time);
	
	if (GUI.Button(new Rect(5, 280, 67, 41), bt_pause))
	{
		//pause the scene
	}

}
```

在Unity中我们将Game窗口的模式选择为iPhone Wide(480x320)， 然后运行游戏， 木有什么问题。 紧接着尝试运行在iPhone 4G Wide(960x640)， 你就会发现问题了，整个格局错乱了，并没有有比例的伸缩，然后全部堆到了左边；如果你尝试iPhone 5 Wide,那就错乱更明显了。

要解决这个问题，我们可以定义一个基准尺寸，我们这里是480*320.

``` c#

public static Vector2 NativeResolution  = new Vector2(480, 320);

```

然后了，我们要让长宽按照这个基准来变化，包括首先是伸缩放大或缩小，其次是在变化之后使其保持居中。


``` c#

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
	

```

这里我们根据长宽比，算出伸缩比例，然后为了保证伸缩之后的画面能始终在屏幕中间，我们要算出多出来偏移量，最后我们根据这个偏移量和缩放比例对矩阵进行变化。
