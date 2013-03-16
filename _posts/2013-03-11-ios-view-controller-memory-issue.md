--- 
layout: post
title: "iOS ViewController内存问题"
category: "ios"
published: true
---

在做一个关于相片的app中，发现app使用起来是越来越慢，甚至就是有时崩溃了最后.我们用instruments打开之后观察内存的使用情况发现，从root vc -> detail A vc 之后内存占用变大了，这个没有任何问题，但是从detail A vc返回到root vc之后发现内存占用率却依然是没有降下来.所以如果你尝试几次root vc -> details A vc -> root vc --> detail B vc --> root vc， 这里当然是基于UINavigationController来管理每个controller之间的过渡，就会发现内容占用简直要爆表了. 
	
这个很奇怪，我们当时想也许是从detail A返回之后， detail A的viewDidUnload方法没有被调用，所以它所引用的对象都没有被释放.这个就很奇怪了，我的理解是如果你一旦调用了popViewController:animated（如果你使用Seague，其实质也是调用此方法), 那么对应的detail A viewcontroller的viewDidUnload应该是会调用的，如果不是立刻被调用，也应该是很快。但是却发现一直没有被调用，但是dealloc()方法却是被调用了。于是为了验证我的理解是否准确，我创建了一个新项目，很简单的流程 UINavigationController -> RootVC -> DetailVC， 然后调试后发现，每次从DetailVC返回到RootVC，DetailVC的dealloc()几乎是“立刻“”被执行了，但是viewDidUnload却是没有.看了一下api文档,
	
	Called when the controller’s view is released from memory. (Deprecated in iOS 6.0. Views are no longer purged under low-memory conditions and so this method is never called.)

所以这个是其实是在iOS5上只有当出现Receiving memory warning,才会被调用.

反过头来，我觉得那么Detail VC的viewDidUnload是没有被调用，但是dealloc方法应该是被调用了，那么内存占用率应该是降下来才对啊，但是却发现dealloc根本木有被执行.

所以猜测应该是这个对象依然仍然被引用着，导致无法被回收。 仔细看了看代码，使用了最笨的调试方式--就是删除所有代码，只保留非常基础的代码之后发现依然没有被调用。 接着看了看它的父类，果然发现了问题.

在BaseViewController的viewDidLoad中发现了下面代码：

	[NSTimer scheduledTimerWithTimeInterval:2.0 target:self selector:@selector(updateSyncStatus:) userInfo:nil repeats:YES];
	[self updateSyncStatus:nil];
	
	
	(void)updateSyncStatus:(id)sender {
	     BOOL nowSyncing = ([[SyncManager sharedInstance] uploadInProgress] || [[SyncManager sharedInstance] downloadInProgress]);
	     if (nowSyncing!=self.syncing) {
		 	....
	     }
	 }


	
你可以发现代码中只有初始化timer，却没有相对的invalidate timer的代码，但是本应该被释放的对象无法被回收，致使内存占用率居高不下.

	The dealloc method was not being called if any of the references held by a viewcontroller were still in memory

将初始化timer放到viewWillAppear，invalidate timer的代码放到viewWillDisappear变解决了问题.	