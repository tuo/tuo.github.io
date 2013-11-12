---
layout: post
title: "iOS7 Teck Talks Shanghai"
date: 2013-11-12 23:21:59 +0800
tags: iOS
--- 

比较幸运的被选中参与了苹果组织的[iOS7 Tech Talks](https://developer.apple.com/tech-talks/)上海站的活动， 整个活动有两天，分别是iOS7应用开发和游戏开发。 我选择报名了App开发讲座，这个讲座会有一整天而且整个安排都非常的紧凑，虽然其中有些东西我在WWDC 2013的视频中有看过，但是总体而言，还是很有收获的，因为它不仅仅只是关于开发，它还有关于UI设计的，市场等等， 总的来看就是WWDC 2013的精简版。

![iOS7 Tech Talks Shanghai](http://d.pcs.baidu.com/thumbnail/4df58e4190668fb38483cf8f7639e013?fid=103032193-250528-3054655043&time=1384269931&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-VjNCDqIgFjh2HLbnwrfnr8IZv%2BM%3D&rt=sh&expires=8h&r=497402287&size=c710_u500&quality=100)

  简单梳理一下自己觉得有意思或者自己之前不太了解的一些知识点吧。

## Interface Design

我印象深刻的是关于按钮上得图标设计。比如按钮一般都有正常和被选中两种状态，每种状态对应不同样式的图标。在iOS6上面，按钮图标正常状态是突出来，而被选中状态的图标就是凹下去的效果(阴影啊渐变啊都不一样)；在iOS7上面可能就不一样了， 在正常状态的图标当然肯定木有什么阴影啊渐变等拟物化的效果，一般来说，你最好保持图标的stroke(描边?)的宽度为1个pt， 然后尽量保证图标简洁，不要有太多的填充。 为什么了？ 

因为选中状态的图标相对正常状态下得图标有两种变化： 

	1. 将描边的宽度增加一个pt
	
	2. 填充整个图标的颜色为蓝色或者对应的颜色
	
其中第二条也是为什么你的图标尽量要简洁，不要有太重的填充，最好是简单是几条线条就能勾勒出来，可以参考Safari，AppStore和WWDC等应用的设计。

总结来说在设计图标时，尽量遵循三个原则：

	1. 尽量使用简单的几何图形，比如三角形，圆圈，直线，矩形就能勾勒出图标

	2. 保持描边的宽度在1pt

	3. 坚持填充部分的比列


对于按钮，iOS7的按钮被大大的简化了， 没有拟物化那么多得细节， 一般来说对于在导航栏和tab bar而言，按钮需要多余的边框，只需要突出的颜色，比如蓝色就好了，因为这些位置就足以告诉用户这些是按钮而不是标签。 

但是对于其他位置的图标， 就不能这么简单了， 比如你有多个按钮垂直的排列，如果直接使用按钮，用户可能无法知道说这个是可以交互的按钮，可能以为这只是标签而已。 你可以使用table view将这些按钮封装起来， 这样一来按钮中间有了分隔线，可以帮助用户更容易的区分，同时table view也让按钮的点击区域覆盖了整个屏幕。

对于横向排列多个按钮，一是可以采用table view, 另外一个可以给按钮加边框。

尽量还是参考原声的应用，仔细分析每一个细节，然后思考为什么这么做。

## iTunes Connect


这里讲了很多东西， 还包括不少iTunes Connect中如何仔细选择app的名字，描述， story-telling的截图，以及如何选取关键字。

-  描述尽量简洁，最好三四行文字能慨括出app的应用场景。因为一般来说在appstore中浏览时，超过4行就会有一个“更多”或者“展开”的选项，用户很有可能都懒得点开这个，所以你需要简单简洁的描述你的app.

  
-  应用截图。最好了应用的截图顺序能够流畅的表达出应用的特点和场景。最好不要在上面加一些多余的什么漂浮的文字。

-  关键字。尽量不要有重复的字段，或者同时出现单复数，也不要选择app所在的类别。

	  比如说你有一款音乐应用,下面的这个描述：

	*Music, Music art, album, albums, tracks , song, iTunes*
	
	  可以改为: 	  
 	 *album, song, track (后面的记不起来了。。。)*


现在iTunes Connect中每个应用的每个版本会有100个promo code

现在价格策略中，引入了新的价格策略。 比如之前在美国是0.99美元，在中国是6.00人民币的第一价格梯队， 有了更多选项， 比如在美国仍然还是0.99美元，在中国却是8.00人民币的价格梯队。


## Marketing

推广渠道：

1. 让社交应用更多深入的集成到应用中。 比如你可以直接从应用中分享内容到社交圈子，或者可以直接可以关注比如官方微博或者微信等等。

2. 使用smart app banner.简要的说就是在web页面的移动版本中只需要添加一行代码，就可以实现当手机访问这个网页时，网页顶部会出现一个banner, iOS会检查这个应用是否已经安装，如果没有，将提示用户下载，如果有，提示用户打开。 具体的效果，你可以尝试在safari中访问tmall.com天猫来看一下天猫是如何做得。

3. 在第二条基础之上，保证有多个可以提示安装APP的入口，这样一来用户可以随时方便的安装app. 比如在第二条的网页中的smart banner,永远会待在顶部，当你滚动页面时，可能就看不到了，你需要在页面的其他地方，比如中间和底部加安装应用的入口。

4. 使用内置的商店表单。比如一般来说应用或者游戏都会有一个"more games/apps"， 当用户点击这个按钮，会在应用中显示app store,并且展示公司下所有的应用或者游戏。

5. Trailer预告片。 

      - 预告片的头六秒钟是最重要的；
      - 尽量保持长度在30到60秒；
      - 使用专业的视频捕捉工具；
      - 尽量选一个更好的音乐轨；
      - 保证有明显的比如“download in appstore”下载的点击提示      
<br/>
6. 多种下载入口。比如可以使用下载徽章或者使用二维码，因为在国内二维码扫描下载可能更加方便。


## iOS6 Compatibility Coding Strategy

如何保证向后兼容性了？ 从开发的角度来看有几点：

1. 框架。 保证新的框架在build settings里Link Library中将其标记为optional. 如果被标记为required, 应用在启动时发现没有对应的框架时，会拒绝启动，直接崩溃。

2. 新的类。在新类上面直接调用方法并不会有问题，因为系统会直接将其替换为nil.

3. Capability. 比如motion和mail,你可以通过[MailManager canSendMail]类似的来检测是否被支持。

4. 方法。 可以使用respondToSelector来检测是否被支持。
{% highlight objectivec %} 
SEL notImpSelector = @selector(notImp:);

if([tester respondsToSelector:testSelector])
{		   
    //call it
    [tester notImp:param];
}else{
	//fallback
}

{% endhighlight %} 

你可以看到在这个过程中你会发现很多这样的if/else，如果这只是一两处没有问题，但是如果出现了很多次，那么这个就会非常痛苦，特别是维护，当你想删除或者修改内部实现细节时，你不得不一个一个搜索出来并修改。

理论上你不应该去考虑或者太多知道这些关于iOS实现差异的细节，你是app开发者，你关注是你的应用逻辑和实现，底层这些细节应该一种更加透明的方式被封装起来。

为了应对此问题， 我们可以采用三种策略来封装这个细节：

**1. Class Cluster**
	
	这个在iOS中被广泛使用， 比如UIButton,它只有一个通用的interface，但是它的实现中却是有几种不同的实现。举个例子，在iOS7中有新的更强大的[NSURLSession](http://www.raywenderlich.com/51127/nsurlsession-tutorial), 但是在iOS6还是只有NSURLConnection. 假设我们有一个DownloadManager类来封装这个细节，对外它有一个DownloadManager.h有开始，暂停，终止等操作。在DownloadManager.m中代码会使这样的：
	{% highlight objectivec %} 

	@interface DownloadManager_NSURLSession : DownloadManager
	// implementation goes here for using NSURLSession
	@end
	
	@interface DownloadManager_NSURLConnection : DownloadManager
	// implementation goes here for using NSURLConnection
	@end
	
	
	@implementation DownloadManager
	
	+(instancetype)sharedInstance {
	    if([NSURLSession class] != nil){
	        return [[DownloadManager_NSURLSession alloc] init];
	    }else{
	        return [[DownloadManager_NSURLConnection alloc] init];
	    }    
	}
	
	@end

	{% endhighlight %} 	
		
日后你不需要支持iOS6时，你只需要该一处地方。

**2.Data Delegate 委托**

这个模式那更加常见了，iOS本身很多地方都运用了这个模式，以便减少不必要的继承，继承是如此容易被滥用，更多时候你应该考虑责任划分，比如像tableview, 它有数据来源的委托，也有界面更新事件的委托。下面展示如何使用这个模式：
	
	{% highlight objectivec %} 
	@interface DownloadManager()
	@property (weak) id<Downloader> downloader;
	@end
	
	
	
	@implementation DownloadManager
	
	+(instancetype)sharedInstance {
	   id<Downloader> delegate = nil;
	   if([NSURLSession class] != nil){
	       delegate =  [[NSURLSessionDownloader alloc] init];
	   }else{
	       delegate = [[NSURLConnectionDownloader alloc] init];
	   }
	   return [[self alloc] initWithDownloader:delegate];
	}
	
	@end
	{% endhighlight %}

**3. 使用Category来封装新方法**
	
在iOS中使用一个category来封装这个细节，比如在iOS7中UIView增加了一个方法addMotionEffect，对于此我们可以创建一个UIView+Compatibility的category, 代码如下:
	{% highlight objectivec %} 
	@implementation UIView (Compatibility)

	- (void)c_addMontionEffect:(UIMotionEffect *)effect {
	    if([self respondsToSelector:@selector(addMotionEffect:)]){
	        [self addMotionEffect:effect];
	    }     
	}
	
	@end	
	{% endhighlight %}
到时候当你不需要时，直接rename就好了。

总的来说，你需要思考我应该支持这个功能吗，如果这个需要花费很多时间，你就需要权衡了，因为目前iOS7的占旅游高大71% 而iOS6也才20%?(这里我不记得会议那个百分比了，这个不是很重要啦),关键是你有时候你根本不需要这么大费周章让向后兼容那么完美。


## Useful Coding Tips

使用instrument可以做很多的事情，帮助你分析你应用的一些可以提高的地方。比如Time CPU这个分析，你可以发现比如
{% highlight objectivec %} 
	[myArray enumerateObjectsUsingBlock:^(id object, NSUInteger index, BOOL *stop) {
	    [self doSomethingWith:object];
	}];
{% endhighlight %}	

这个在多核时依然会出现遍历是线性的。你可以使用NSEnumerationConcurrent来发挥多核的优势：
{% highlight objectivec %} 
	[myArray enumerateObjectsWithOptions:NSEnumerationConcurrent usingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
	    [self doSomethingWith:object];
	}];
{% endhighlight %}
当然前提是你数组遍历跟顺序木有关系。


其它的关于XCode有多优秀，我觉得AppCode完胜它，就不多解释了，特别是重构的支持。


最后说一下，关于本地化的测试。如果你做过这方面的开发测试，你知道这玩意调试起来很麻烦的，每次需要跑到设置中切换语言，然后重新打开应用。 现在你可以是多个scheme来简化这个流程.

![Xcode: Run project with specified localization](http://i.stack.imgur.com/ZWpLF.png)

## 题外话

在会议的末尾有一个活动的环节，有机会跟Apple的工作人员交流一下，我刚好有机会跟一个负责app review的工程师聊了聊。其实他们的工作也是一部分自动一部分手动，而且一般来说你只要看了那个app review的册子，基本上应该不会被拒掉。顺便聊了下工作经历生活等等，最后我跟说了一下我的一个想法。 因为我们知道XCode上传的binary其实包含几部分，一个是exec可执行文件（指令）， 一部分是xib，一部分是storyboard,最后还有所有的图片。而且刚好后面有session提到说你应该尽量减少图片的大小，特别是在iPad上面，图片会比iPhone上大很多，有些时候有些相片类图片最好使用JPEG格式。我在想，其实应该理论上有可能说在用户从iPhone/iPad上登录AppStore的话，AppStore是可以得到你设备的信息，比如是否支持Retina显示，如果不支持，那AppStore会聪明动态将应用链接到非retina得图片集，然后下载下去；相反，选取高清图片集，准备下载。虽然说理论上用户有可能在mac/windows上的iTunes来买东东，但是大部分情况下都市通过设备，这样一来可以缩减下载文件的大小。

## References

* objc.io [From NSURLConnection to NSURLSession](http://www.objc.io/issue-5/from-nsurlconnection-to-nsurlsession.html)

* [NSArray enumeration performance examined](http://darkdust.net/writings/objective-c/nsarray-enumeration-performance)

* NSHipster [Launch Arguments & Environment Variables](http://nshipster.com/launch-arguments-and-environment-variables/)

* Stackoverflow [Xcode: Run project with specified localization](http://stackoverflow.com/questions/8596168/xcode-run-project-with-specified-localization)
