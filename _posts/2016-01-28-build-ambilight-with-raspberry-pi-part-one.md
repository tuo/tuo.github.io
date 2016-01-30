---
layout: post
title: "用树莓派打造流光溢彩 - Build Ambilight with Raspberry Pi (一)"
date: 2016-01-27 22:21:30 +0800
published: true
tags: 树莓派，流光溢彩，Raspberry pi
---

最近翻出了很久之前买的树莓派(2012 第一代的)， 一看搁那也没有什么用，加上最近整了个PS4，于是想如何把树莓派利用起来然后跟PS4搭配起来整点啥。网上搜了搜，淘宝上买了些配件，自己回来琢磨了下决定搞一个流光溢彩Ambilight.最后弄出来的效果还是不错的，下面是两张调试后之后的效果图(还有些颜色需要调调，但是大概差不多):

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12617360/4d360382-c54a-11e5-950e-99917eef37a1.jpg" align="middle" height="800" width="800" style="display: block;" >

<br/>

<img src="https://cloud.githubusercontent.com/assets/491610/12695255/3d1f5a58-c783-11e5-8c7e-b543301ce642.png" align="middle" height="800" width="800" style="display: block;" >

</div>
<br/>

这系列博客主要记录下这个过程，毕竟国外有博客介绍Ambilight，但是配件啥还是得淘宝上买，然后自己倒腾的过程也碰到了一点坑，总结出来也是抛砖引玉。
 

# 原理
<hr/>
以本码农多年挖坑填坑的惨痛经历来看，开始的理论文档虽然比较枯燥点，但是对后面实践会有很大的帮助。
先上一张原理流程图（引用自http://bite-in.com/?p=9,我在这上面注释了下）：
<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12695365/cad7a32a-c786-11e5-9322-0821996a2e80.jpg" align="middle" height="600" width="600" style="display: block;" >
</div>
<br/>
Ambilight原理其实很简单，首先您需要一个视频源，比如我这里是PS4，是IPTV，是电脑等等，这里必须是HDMI的高清信号源。接下来需要个HDMI的分配器1进2出，进的一端连接到信号源，出的两个端口，一个连接到电视，另外一个给树莓派来处理。但是你不能直接将HDMI信号给树莓派使用，暂时目前没有办法抓取HDMI信号，所以得退回使用传统的AV模拟信号，所以这里需要个将HDMI转AV的转换器.这里拿到视频Video信号之后，需要一个USB视频帧抓取器，也就是USB接口的视频采集卡，将视频信号转换为USB输出，输入给树莓派。树莓派拿到视频帧信息之后，可以根据预先的配置信息，这里比如有多少个LED灯，方向，色值，颜色转换，频率等等，输出到LED灯带，进而使其按照我们的设想来发光。

配置LED灯带的发光序列和映射是通过树莓派基于OSMC系统上的Hyerion来操作，我会在接下来的部分中仔细描述。

# 配件清单
<hr/>
分析了原理之后，就需要准备和采购配件了，这里我会列举出组件和淘宝的链接和价格，方便各位参考。

* Raspberry Pi(树莓派)： 树莓派是这个实验中最核心的部分，作为控制中心。我的树莓派是2012年时在官方[Elements 14](http://cn.element14.com/raspberrypi-boards)买的，当时的配置是256M内存，各项配置远远没有现在高，但是貌似价格也没有太大幅度的涨价。因为树莓派的操作系统是存储在从外部的闪存卡中。所以记住同时买一个8G的闪存卡还有一个读卡器。（价格：250左右）

* LED灯带:这个是比较关键的零件，我使用的是5V的WS2801型号，这个型号是比较基本和简单的。我量过我的电视上+左+右（因为一般来说底边是不需要发光的），所以买了3米。[淘宝链接](https://item.taobao.com/item.htm?spm=a1z09.2.0.0.oA67Yc&id=524231976847&_u=uc8grg44335),选取`白色裸管`，价格：39.9 * 3 = 120。

* HDMI分配器1进2出：需要将一个高清信号渠道分解到两个。 [淘宝链接](https://detail.tmall.com/item.htm?id=37175115047&spm=a1z09.2.0.0.oA67Yc&_u=uc8grg49cb0) 价格：58

* USB视频采集卡: 这里我们使用基于STK1160的EasyCap DC60型号。[淘宝链接](https://item.taobao.com/item.htm?spm=a1z09.2.0.0.oA67Yc&id=16201083207&_u=uc8grg43036) 价格： 24

* HDMI转AV线转换器： 高清信号转模拟信号，就需要顶多带几米的LED灯带，也不需要高清信号那么奢侈，模拟信号刚好。[淘宝链接](https://item.taobao.com/item.htm?spm=a1z09.2.0.0.Hagliz&id=522842971813&_u=uc8grg40942) 价格：68

* DC 5V/8A电源一个：记住这个电压非常关键，本实验中所有耗电组件额定电压是5V。如果你只是要带LED灯带，这个足够了。 但是如果你想像我一样，希望用一个电源供给所有的组件，比如LED灯带，树莓派，HDMI分配器，以及HDMI转AV的转换器，那其实我发现买的功率不是很够带动所有的组件，买一个5V/12A 或者 5V/20A的会比较稳妥，我后面会描述如何计算功率来选取合适的电源。 [淘宝链接](https://item.taobao.com/item.htm?spm=a1z09.2.0.0.Hagliz&id=525650598251&_u=uc8grg438f7) 价格： 30.

* HDMI高清线 若干条。[淘宝链接](https://detail.tmall.com/item.htm?id=10773105194&spm=a1z09.2.0.0.Hagliz&_u=vc8grg46b6c)

* AV公对公直通头： 需要将视频采集卡和HDMI转AV线转换器连接起来。[淘宝链接](https://item.taobao.com/item.htm?spm=a230r.1.14.144.bfGq9d&id=40743240102&ns=1&abbucket=5#detail) 价格: 4

* 杜邦线 公对母 公对公：杜邦线可以帮助连接树莓派和LED灯带，以及LED灯带分解和焊接。[淘宝链接](https://detail.tmall.com/item.htm?id=21555044507&ali_refid=a3_430583_1006:1106005875:N:%E6%9D%9C%E9%82%A6%E7%BA%BF:6d3d28cb03feaf6adca31ae0c1dacbe7&ali_trackid=1_6d3d28cb03feaf6adca31ae0c1dacbe7&spm=a230r.1.14.1.wtPjjh&skuId=3108837394481)

* DC电源插座5.5-2.1mm 母头: 这里我们需要将它和LED灯带的供电接头连接起来实现对灯带的供电。[淘宝链接](https://item.taobao.com/item.htm?spm=a230r.1.14.23.uszV7w&id=525229013449&ns=1&abbucket=5#detail)

* DC母头转Micro USB: 实现对树莓派供电。（如果你不是集中一起供电，这个不是必选的）[淘宝链接](https://item.taobao.com/item.htm?spm=a230r.1.14.20.xZnjnh&id=523792521607&ns=1&abbucket=5#detail)

* DC电源分线一拖四：将电源转4路，供给树莓派，LED灯带，HDMI2AV, HDMI分配器。（如果你不是集中一起供电，这个不是必选的） [淘宝链接](https://item.taobao.com/item.htm?spm=a230r.1.14.56.upUcMJ&id=523898222188&ns=1&abbucket=5#detail)

还需要一些焊接LED灯带需要的洛铁，焊锡和焊锡膏，我买的就是住的地方下面的五金店20块的那种，用起来也挺顺手的，丢了也不觉得多肉疼。一个USB键盘（20块）来实现基本的树莓派系统设置，几米长的一根网线给树莓派网络来实现从电脑上远程SSH控制操作。我买了一个USB无线网卡[淘宝链接](https://item.taobao.com/item.htm?spm=a1z09.2.0.0.evpmfe&id=22921464431&_u=vc8grg4b0df)，来配置一下无线网络，这样不用拖着很长的网线，不过这篇博客不会描述这一部分，使用有线网络比较简单。

# LED灯带功率计算
<hr/>

这里需要计算LED灯带消耗的功率是多少。从WS2801的技术规格来看，它的工作电压是5V，至于每一颗灯粒大概消耗0.3W，所有有了这些我们就只需要知道安装到我的电视43寸需要多长的灯带即可。大概比划了下，记住这里我不需要电视机底部的LED灯带（因为我的电视是放在桌子上的，并不是挂在墙上，底部灯光效果会有影响，所以去掉底部的灯带），需要灯带的长度为2.6m. 每米LED灯带有32颗灯点，所以这里我们就知道我们需要多少瓦特的功率了。

    2.6米的灯带 * 32颗每米 * 0.3W = 24.96 W 也就是 24.96W/5V = ~5A的电流 

但是建议加上10%的损耗，功率大点总是好的，不然小了还亮不起来。

如果你是给个组件单独供电，那么给灯带选取的电流建议选取6A(5A加上损耗)，也就是5V 6A的电源。

如果你是给所有的组件供电，对的很幸运，所以得组件的额定电压都是5V， 那么还的加上树莓派的1A，HDMI转AV的1A，HDMI分配器的1A（这些请查阅技术规格，淘宝页面上有的）， 最后需要8A在加上10%的损耗，建议买5V 10A的电源。
























