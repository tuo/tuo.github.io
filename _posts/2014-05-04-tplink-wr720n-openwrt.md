---
layout: post
title: "TPLink WR720N刷OpenWrt - 修砖"
date: 2014-05-04 17:06:50 +0800
tags: #openwrt, #wr720n
---

一年一度的NBA季后赛开始了，今年季后赛第一轮更是尤其精彩，连续两天五场抢七，还有惊心动魄的火箭打开拓者，看的我这个篮球迷如痴如醉。但是比赛一般都在早上，而且比赛时间还挺长的，如果看完了再去上班肯定稳稳的迟到，如果晚上回来想看录像了又觉得网速那个点又慢，而且我对国内的解说说实话也不是感冒，看英文的可能还舒服点，没那么吵吵。所以我希望在比赛结束了（一般都是中午左右）， 在上班的间隙我把种子下好，然后上传到比如我家里路由器暴露在外面上某个网址上，可以利用迅雷下载的速度优势，在下班回家前就把高清录像下好了。我回到家里的时候，直接从电脑上stream路由器的存储媒介（通常是硬盘）上下好的视频。

选路由器是因为我不可能把家里的笔记本一直开一天吧，这个也太浪费了把。而且路由器本来就是在那开一天的，倒也不浪费。所以怎么捯饬这玩意可以达到我上面美好的愿望了？就是*[OpenWrt](http://openwrt.org/)*了。简单的说，我将要干的事情就是把路由器出厂自带的固件也换成Openwrt。我发现网上有不少关于这方面的教程（大部分还是703N，有点老了），但是没有讲的很清楚从头到尾很直白的那种，这篇博客就是记录自己刷机的过程

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
	* 杜邦线（用于焊接和连接USB模块）
	
就可以了。

####1. 接线
接下来就是拆机找到TP_IN和TP_OUT两个引脚。这个拆机还真有点技巧性。因为720N这个塑料外壳还真是一次性的，用蛮力的话盒子就没法用了，那么就不能插电源充电了，就只能是用microusb线充电了。但是因为引脚实在板子背面所以我们必须要将板子取出来。我想了一个办法就是拿烧红的刀直接去砍网口那边的两侧，这样一来板子可以取出来而且以后要是弄好了我还可以放回去，插电源充电也木有问题。

拆完机之后就是这样一块板子。

如果你仔细看背面中间，就可以发现TP_IN和TP_OUT连个引脚，但是它们都非常小，这就使得焊接非常难。			

使用电烙铁小心将杜邦线焊接到这两个接口上，另外一根线作为接地线GND随意焊接到哪都行，图方便的话直接焊接到USB接口外壳上也可以。

最后将引出的杜邦线连接到USB转TTL模块上。这里USB模块上写着`黑GND, 白RXD,绿TXD`.我们要做就是将引出的`TP_IN`针连接到`白RXD`上， `TP_OUT`连接到`绿TXD`口上。

注意注意：千万别将TP_IN或者TP_OUT连接到VCC口上，不然直接就把板子给烧了。（我去，我最后不小心看花眼连接错了直接把板子给烧了，是的，程序员不能在困的时候干正事）

####2. 安装驱动
你直接连接好线是不能直接用的，串口还是无法被识别出来。你需要下载对应的驱动，也就是PL2303 USB to TTL驱动， [mac版]( http://www.prolific.com.tw/US/ShowProduct.aspx?p_id=229&pcid=41)以及[windows版](http://pan.baidu.com/s/1kTn1d6R).

给路由器供电，这里我们使用microUSB来供电，接下来就是去`设备管理器`中查看`端口(COM和PT)`下面有没有东西，如果有类似于`Prolific USB-to-Serial Comm port(COM4)`，就表示识别成功。然后点击`属性`将其波特率改成`115200`.

####3. 调试
到这一步就差不多可以干正事了，我们可以使用串口通信软件来发送指令来刷固件，这里用的是SecureCRT。很简单，我们创建一个串口连接，将其COM口设成设备管理器中显示的端口号，波特率设为115200.

拔掉microUSB线，然后重新连上，你就可以看到SecureCRT中开始滚动了，你应该可以看到如下信息，没有反应的话，检查你得rx/tx是否接反了。

是的，我们看到了uboot的引导信息。接下来就是怎么样打断其正常引导过程，因为Flash卡中的固件已经损坏了。但是我们不可能把Flash卡拔下来，把原厂库件刷进入，然后插回去重启。我们就需要告诉uboot从其他地方这里比如就是我们的电脑下载到flash卡中。 这里就可以配合tftp来实现从电脑上下载。为什么是tftp了？如果你后面进入了uboot输入模式，输入`help`就可以看到其中有一个选项：

	tftpboot- boot image via network using TFTP protocol

可以理解为TFTP是uboot能理解的轻量级FTP.

用网线一端连接路由器的WAN/LAN口，一端连接电脑。打开电脑,设置ip地址：


	IP: 192.168.1.3
	Mask: 255.255.255.0
	gateway/router: 空白 不要填 

然后重启路由，在SecureCRT中看到如下信息的时候


	U-Boot 1.1.4 (Jun 20 2012 - 17:03:09)
	
	AP121 (ar9330) U-boot
	
	DRAM:  32 MB
	led turning on for 1s...
	id read 0x100000ff
	flash size 4194304, sector count = 64
	Flash:  4 MB
	Using default environment
	...

迅速在键盘上敲下`tpl`,要快，相当于电脑上按F12来进入BIOS. 
这个时候串口会停止打印, 并出现`hornet>`,就表示进入了输入模式。

在输入命令之前，回到电脑上下载安装好TFTP软件, 然后选择共享文件夹为比如`桌面/openwrt`，在这个文件夹下放入下载好的[原厂固件wr720nv3](http://service.tp-link.com.cn/detail_download_918.html)。

回到SecureCRT中，按照如下步骤输入命令：

1. ***hornet> setenv serverip 192.168.1.3***

	这里设置TFTP服务器的地址，这样wr720nv3.bin可以被uboot访问到			
		
2. 	***hornet> tftpboot 0x80000000 wr720nv3.bin***

	这里wr720nv3就是tftp共享的文件名字,确保TFTP服务器打开状态
	你应该可以看到如下输出：
	
		eth1 link down
		Using eth0 device
		TFTP from server 192.168.1.3; our IP address is 192.168.1.111
		Filename '720.bin'.
		Load address: 0x80000000
		Loading: *.#################################################################
		. #################################################################
		. #################################################################
		. #################################################################
		. #################################################################
		. #################################################################
		. #################################################################
		. #################################################################
		. #################################################################
		. #################################################################
		. #################################################################
		. ######################################################
		done
		Bytes transferred = 3932164 (3c0004 hex) 
	
3. ***hornet>erase 0x9f020000 +0x3c0000***
	
		First 0x2 last 0x3d sector size 0x10000
		....   2....   3....   4....   5....   6....   7....   8....   9....  10....  11....  12....  13....  14....  15....  16....  17....  18....  19....  20....  21....  22....  23....  24....  25....  26....  27....  28....  29....  30....  31....  32....  33....  34....  35....  36....  37....  38....  39....  40....  41....  42....  43....  44....  45....  46....  47....  48....  49....  50....  51....  52....  53....  54....  55....  56....  57....  58....  59....  60....  61
		Erased 60 sectors

4. ***hornet> cp.b 0×80000000 0x9f020000 0x3c0000***
	
		Copy to Flash... write addr: 9f020000
		done

5. ***hornet>bootm 0x9f020000***


完整的命令是如下：

		setenv serverip 192.168.1.3
		tftpboot 0x80000000 wr720nv3.bin
		erase 0x9f020000 +0x3c0000
		cp.b 0x80000000 0x9f020000 0x3c0000
		bootm 0x9f020000


基本上刷机完成。

####4. 验证

怎么验证是否成功了？ 重启路由，插入网线，连接无线网络（好像是TP-Link-MXXXX不记得了）， 输入192.168.1.253。

登进去就说明没什么问题了，修好了, 修砖完成。


#####引用

* [TP-LINK WR703 内部和TTL BY ONIONISMINE@不小心刷坏、船长@估算TTL](http://www.sl088.com/voyage/2012/03/3197.slboat)
* [TP-720N (v3 Flash为4M) 修砖记录](http://www.right.com.cn/forum/thread-100003-1-1.html)







