---
layout: post
title: "TPLink WR720N刷OpenWrt"
date: 2014-05-04 17:06:50 +0800
published: false
tags: #openwrt, #wr720n
---

一年一度的NBA季后赛开始了，今年季后赛第一轮更是尤其精彩，连续两天五场抢七，还有惊心动魄的火箭打开拓者，看的我这个篮球迷如痴如醉。但是比赛一般都在早上，而且比赛时间还挺长的，如果看完了再去上班肯定稳稳的迟到，如果晚上回来想看录像了又觉得网速那个点又慢，而且我对国内的解说说实话也不是感冒，看英文的可能还舒服点，没那么吵吵。所以我希望在比赛结束了（一般都是中午左右）， 在上班的间隙我把种子下好，然后上传到比如我家里路由器暴露在外面上某个网址上，可以利用迅雷下载的速度优势，在下班回家前就把高清录像下好了。我回到家里的时候，直接从电脑上stream路由器的存储媒介（通常是硬盘）上下好的视频。

选路由器是因为我不可能把家里的笔记本一直开一天吧，这个也太浪费了把。而且路由器本来就是在那开一天的，倒也不浪费。所以怎么捯饬这玩意可以达到我上面美好的愿望了？就是[**OpenWrt**](http://openwrt.org/)了。简单的说，我将要干的事情就是把路由器出厂自带的固件也换成Openwrt。我发现网上有不少关于这方面的教程（大部分还是703N，有点老了），但是没有讲的很清楚从头到尾很直白的那种，这篇博客就是记录自己刷机的过程

## 首次刷机尝试

手头有的东西名目:
	* 一个很早之前买的TPLink WR720N迷你路由
	* 一根microUSB线
	* 网线
	
那选择WR720N也是因为首先它便宜啊，而且它自带一个USB口(方便挂载外设），一个microUSB口，一个LAN口，还有一个WAN/LAN口， 真实麻雀虽小，五脏俱全。

而且Openwrt官方已经添加了对WR720N专有固件的支持(你可以找到openwrt支持的所有硬件列表[Table of Hardware - Router type](http://wiki.openwrt.org/toh/start))，使得刷机愈加容易。你需要做的就是去这个地址[http://downloads.openwrt.org/snapshots/trunk/ar71xx/](http://downloads.openwrt.org/snapshots/trunk/ar71xx/)找到[openwrt-ar71xx-generic-tl-wr720n-v3-squashfs-factory.bin](http://downloads.openwrt.org/snapshots/trunk/ar71xx/openwrt-ar71xx-generic-tl-wr720n-v3-squashfs-factory.bin)和[openwrt-ar71xx-generic-tl-wr720n-v3-jffs2-sysupgrade.bin](http://downloads.openwrt.org/snapshots/trunk/ar71xx/openwrt-ar71xx-generic-tl-wr720n-v3-squashfs-sysupgrade.bin)，然后下载到本地。

接下来就是登陆路由器,720N就是192.168.1.253,然后找到左侧最下面的`升级`，选取将本地刚刚下好的factory.bin(不是sysupgrade.bin)）升级,耐心等重启之后就可以了。

为什么这里是factory而不是sysupgrade了？ [FAQ before installing OpenWrt](http://wiki.openwrt.org/doc/faq/before.installation)

>What is the difference between the different image formats?
>
a factory image is one built for the bootloader flasher or stock software flasher
> 
sysupgrade image (previously named trx image) is designed to be flashed from within openwrt itself

## 刷成砖头了 :(
是的，应该很简单，应该木有问题的，但是很不幸我的刷成了砖头了，ping不通，IP地址无效，重设了N遍都木有任何反应。 

怎么办了？我大概了解下路由器启动过程，一般路由器都有一个Flash卡（相当于电脑的硬盘，里面有你个操作系统文件等等），里面有你写好或者下好的固件.当路由器启动时，有一个启动引导程序uboot（相当于windows上BIOS),一般来收它会从Flash卡读取固件（相当于windows比如默认从硬盘上启动操作系统）并加载到内存中。

这里就是一般来说就是Flash卡中的固件已经损坏了，我们需要擦除里面已有固件信息，然后将原厂固件刷进去。但是这个怎么操作了，我们都进不去路由？

## TTL修砖
除了砸了之外还是有办法挽救的 - TTL线。 我也不太清楚这个具体原理，大概就是你需要找到路由器板子上的两个接口TP_IN和TP_OUT(可以用来接受和发送指令),这里相当于外设，然后与电脑(COM)进行串口通信。

但是笔记本木有COM端口了，需要将USB转换成COM端口，然后与路由器电路板上连接，接着使用串口通信的软件设置对应的串口号以及波特率，这样就可以发送指令到路由器电路板，从而修复固件。

我们需要的东西:
	* USB转串口的TTL线（可以从淘宝上买[USB转TTL模块](http://item.taobao.com/item.htm?_u=tc8grg404cf&id=14126761542)）
	* 电烙铁 
	
就可以了。

接下来就是拆机找到TP_IN和TP_OUT两个引脚。

			






