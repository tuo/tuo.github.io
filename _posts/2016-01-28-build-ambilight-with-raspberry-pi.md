---
layout: post
title: "用树莓派打造流光溢彩- Build Ambilight with Raspberry Pi"
date: 2016-01-27 22:21:30 +0800
published: true
tags: 树莓派，流光溢彩，Raspberry pi
---

最近翻出了很久之前买的树莓派(2012 第一代的)， 一看搁那也没有什么用，加上最近整了个PS4，于是想如何把树莓派利用起来然后跟PS4搭配起来整点啥。网上搜了搜，淘宝上买了些配件，自己回来琢磨了下决定搞一个流光溢彩Ambilight.最后弄出来的效果还是不错的，下面是两张调试后之后的效果图(还有些颜色需要调调，但是大概差不多):

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12617360/4d360382-c54a-11e5-950e-99917eef37a1.jpg" align="middle" height="800" width="800" style="display: block;" >

<img src="https://cloud.githubusercontent.com/assets/491610/12695255/3d1f5a58-c783-11e5-8c7e-b543301ce642.png" align="middle" height="800" width="800" style="display: block;" >

</div>
<br/>

这篇博客主要记录下这个过程，毕竟国外有博客介绍Ambilight，但是配件啥还是得淘宝上买，然后自己倒腾的过程也碰到了一点坑，总结出来也是抛砖引玉。


## 原理

以本码农多年挖坑填坑的惨痛经历来看，开始的理论文档虽然比较枯燥点，但是对后面实践会有很大的帮助。
先上一张原理流程图（引用自http://bite-in.com/?p=9,我在这上面注释了下）：
<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12695365/cad7a32a-c786-11e5-9322-0821996a2e80.jpg" align="middle" height="600" width="600" style="display: block;" >
</div>
<br/>
Ambilight原理其实很简单，首先您需要一个视频源，比如我这里是PS4，是IPTV，是电脑等等，这里必须是HDMI的高清信号源。接下来需要个HDMI的分配器1进2出，进的一端连接到信号源，出的两个端口，一个连接到电视，另外一个给树莓派来处理。但是你不能直接将HDMI信号给树莓派使用，暂时目前没有办法抓取HDMI信号，所以得退回使用传统的AV模拟信号，所以这里需要个将HDMI转AV的转换器，youl

但是你不能直接让树莓派直接赚钱




