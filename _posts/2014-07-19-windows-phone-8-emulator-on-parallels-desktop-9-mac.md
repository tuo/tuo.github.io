---
layout: post
title: "在Parallels Desktop 9运行Windows 8 Phone模拟器"
date: 2014-07-19 12:17:52 +0800
tags: #wp8 #windows #emulator #parallelsdesktop9# #mac#
---

在Parallels Desktop 9中跑起来Windows Phone 8的模拟器来进行开发， 准备工作大概可以分为几部分：

## 操作系统

	Windows 8 64位 Pro版本的iso
	
## 开发工具

[Microsoft Visual Studio Express 2012 for Windows 8](http://www.microsoft.com/en-US/download/details.aspx?id=30664)	选择下载VS2012_WINEXP_enu.ISO就好

##Windows Phone SDK 8.0

建议直接下载iso文件，当然英文最好: [Windows Phone SDK 8.0 iso](http://download.microsoft.com/download/9/3/8/938A5074-461F-4E3D-89F4-5CE2F42C1E36/fulltril30/iso/wpsdkv80_enu1.iso)

##安装顺序
	windows 8  -> visual studio -> wp8 sdk


##Parallel Desktop 9

具体安装流程可以参考[使用 Parallels Desktop 在 Mac 上安装 Windows 和开发工具](http://msdn.microsoft.com/zh-cn/library/windows/apps/jj945424.aspx) 这里有一点需要注意的是，在[步骤 2：设置 Parallels Desktop]中第六步之后，你还需要选中设置面板中第二个tab[Options],下面的左侧的[Optimization]，右侧内容中[Enable nested virtualization]。

![Enable nested virtualization](https://cloud.githubusercontent.com/assets/491610/3633860/411b570c-0f00-11e4-947c-61cc1cbf1e80.png)

在系统安装完毕之后，我们需要打开Hyper-V功能，这是能让模拟器能跑起来的重要条件。

依次打开 `Control Panel` -> `Programs and Features` -> `Turn Windows features on or off` -> tick `Hyper-V`

![Hyper-v](https://cloud.githubusercontent.com/assets/491610/3633861/4cf12098-0f00-11e4-8ee4-c498a98e9526.png)

然后重启电脑。

接下来就是用ultraiso依次加载和安装visual studio和windows phone 8 sdk。

到wp8 sdk安装完毕之后，你应该能看到如下的界面，那就表示安装成功，你可以直接打开vs跑起来了。

![WP8 SDK](https://cloud.githubusercontent.com/assets/491610/3633863/66cdbef4-0f00-11e4-8e19-30d2dd129595.png)

接下来就简单了，跑起来Hello World.

![Hello World](https://cloud.githubusercontent.com/assets/491610/3633873/21cd0b1a-0f01-11e4-94c1-d68667859675.png)


## References

* [Windows Phone 8 开发环境搭建](http://www.cnblogs.com/fengbeihong/archive/2013/01/28/2880179.html)

* [PD9: Running Windows 8 Phone emulator in the Windows 8 virtual machine](http://kb.parallels.com/en/115211)

* [使用 Parallels Desktop 在 Mac 上安装 Windows 和开发工具](http://msdn.microsoft.com/zh-cn/library/windows/apps/jj945424.aspx)


