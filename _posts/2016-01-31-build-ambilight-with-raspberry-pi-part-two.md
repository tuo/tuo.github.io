---
layout: post
title: "用树莓派打造流光溢彩 - Build Ambilight with Raspberry Pi (二)"
date: 2016-01-30 22:21:30 +0800
published: true
tags: 树莓派，流光溢彩，Raspberry pi
---

在我们迫不及待的链接LED灯带使其发光之前，我们先了解下LED灯带的结构和参数，因为如果一旦接线错误，有些后果是无法挽回的，可能整个灯带将会被烧掉。

# LED灯带结构
<hr/>

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12700229/9a979cbc-c815-11e5-8391-43263f5d6a90.JPG" align="left" height="300" width="300" style="margin-left: 130px !important;" />
<img src="https://cloud.githubusercontent.com/assets/491610/12700230/9bfe1a4a-c815-11e5-8d21-5b010a31dfdd.JPG" align="left" height="400" width="400" />
<br/>
<img src="https://cloud.githubusercontent.com/assets/491610/12700369/63867068-c81a-11e5-9a48-b47e21a56b40.png" align="middle" height="500" width="667" style="margin-left: 145px !important;"/>

</div>
<br/>

接头部分有一个接头从左到右有黑，绿，红，蓝色的线。另外一段有也有对应四个连接引脚5V,CK,SI和GND. 特别需要注意灯颗粒上面的箭头，这个是因为灯带的发光方向是有要求的，必须是单方向，从输入到输出，特别是后面布到电视机后面需要将灯带剪开，然后焊接到一起，这个时候必须保证箭头的方向是一致的。

# LED灯带布线电视机
<hr/>

到了动手的环节了， 我们会将LED灯带布线到电视机后面。LED灯带背面有双面胶，将其拨开就可以贴在电视机上面了。我们先从电视机的右边（站在电视机前面面对电视机来看的右边）开始，分成3段，右边->上边->左边，逆时针方向将其布好到电视机上。这里需要保证每一段上面的LED灯带的箭头是一致的。

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12617991/f51f8b20-c54c-11e5-8514-d9110217fa6e.JPG" align="middle" height="500" width="667" style="margin-left: 145px !important;"/>
<br/>
<img src="https://cloud.githubusercontent.com/assets/491610/12617612/691d1512-c54b-11e5-90a9-2ce717334a17.JPG" align="left" height="300" width="300" style="margin-left: 0px !important;" />
<img src="https://cloud.githubusercontent.com/assets/491610/12700458/5a90b424-c81e-11e5-9836-2326d0aceaf2.JPG" align="left" height="300" width="300"  />
<img src="https://cloud.githubusercontent.com/assets/491610/12700477/56cd60de-c81f-11e5-855b-8b52f36c53d5.JPG" align="left" height="300" width="300"  />
</div>

<div style="clear:both;">
</div>

焊接连接头的时候，记住5V对5V,CK对CK, SI对SI，GND对GND。这是个技术活，记得别紧张慢慢来，虽然焊接圆点不打，其实焊接起来还是比较简单的。

# LED灯带跟树莓派接线 #
<hr/>

接下来我们需要给LED灯带连线，我们首先给灯带供电，我们将拿杜邦线将灯带的5V黑色端连接到DC电源母头的正(+)端，GND蓝色链接到DC电源母头的负(-)端。将LED灯带上的CK（时钟信号）连接到树莓派上的SCLK内行第二个引脚上，SI（数据信号）链接到树莓派上内行第四个MOSI引脚。

这里先上一张连线图，在[Phillip Burgess](https://learn.adafruit.com/assets/1589)的基础上，我修改了一下：

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12700514/80ef7bde-c821-11e5-8c98-d0094c83c205.png" align="middle" height="416" width="800" style="margin-left: 0px !important;"/>
<br></br>
<img src="https://cloud.githubusercontent.com/assets/491610/12700536/78fd691c-c822-11e5-8458-93ba138fd62f.jpg" align="left" height="400" width="400" style="margin-left: 0px !important;" />
<img src="https://cloud.githubusercontent.com/assets/491610/12700539/aa6c5a9e-c822-11e5-9693-ddaa5cac4e32.jpg" align="left" height="400" width="400"  />
</div>
<div style="clear:both;"></div>
<br/>

这里树莓派上的GND和5V引脚不是一定需要链接到电源上，大可不必纠结，我只是图方便省事。

# 连接其他组件 #
<hr/>

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12617622/750f5ec0-c54b-11e5-806a-4bf6bdac0f88.JPG" align="middle" height="416" width="800" style="margin-left: 0px !important;"/>
</div>

最后我们把其他组件按顺序都连接起来。

# 软件端准备Hyperion #
<hr/>

目前为止，硬件端基本已经差不多，我们接下来需要准备软件端。

* 操作系统 - [OSMC](https://osmc.tv/).

对于初学者而言,OSMC比较简单直观也有可视化的桌面，上手比较快。我们需要去[下载页面](https://osmc.tv/download/)，选取合适的镜像和平台，下载之后将SD卡插上电脑直接烧录进去即可。 烧录好之后查到树莓派的卡槽中并启动，记得插上网线，然后获取IP地址。
第一次启动需要你用键盘配置下语言，时区等。

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12700628/705c33b2-c825-11e5-9c20-13b2bb610fe5.png" align="left" height="400" width="400" style="margin-left: 0px !important;" />
<img src="https://cloud.githubusercontent.com/assets/491610/12700627/704d4564-c825-11e5-9ed0-67011daefec5.png" align="left" height="400" width="400"  />
</div>

<div style="clear:both;"/>
<br/>


记下IP地址:`192.168.1.3`
<br/>

* LED灯带控件软件 - [Hyperion](https://github.com/tvdzwan/hyperion).

我们需要Hyperion来读取视频截图，然后转换信号并映射到LED灯带上。Hyperion有很多的有点，比如低CPU使用率，后台运行，轻量级，速度快等等，总之是为树莓派量身打造。更重要的是它提供了一个图形化的界面来配置灯带映射的参数等等。

第一步 我们需要SSH登录到树莓派:

{% highlight bash %}
    ssh osmc@192.168.1.3
{% endhighlight %}

OSMC默认的账号是:osmc/osmc。输入密码osmc即可登录。

第二部 安装Hyerion，可以根据[官方文档Installation on OSMC RC3](https://github.com/tvdzwan/hyperion/wiki/Installation-on-OSMC-RC3):

{% highlight bash %}
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install git libqtcore4 libqtgui4 libqt4-network libusb-1.0-0 libprotobuf9 ca-certificates
wget -N https://raw.github.com/tvdzwan/hyperion/master/bin/install_hyperion.sh
sudo sh ./install_hyperion.sh
sudo vi /boot/config.txt（然后末尾添加此行：dtparam=spi=on)     
{% endhighlight %}















