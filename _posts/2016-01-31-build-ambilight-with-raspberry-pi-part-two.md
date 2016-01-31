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
<img src="https://cloud.githubusercontent.com/assets/491610/12700627/704d4564-c825-11e5-9ed0-67011daefec5.png" align="left" height="400" width="400"  style="margin-left: 20px !important;"/>
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


# Hyperion视频采集卡调试 #
<hr/>

安装好后，可以快速调试一下看看是否工作：

{% highlight bash %}
    hyperion-remote --priority 50 --color red --duration 5000
{% endhighlight %}

看看是否都亮红色，比如下图我这里是贴上电视机前先测试的：

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12617541/122d4966-c54b-11e5-8288-d9e75e949eca.JPG" align="left" height="400" width="400"/>
</div>
<div style="clear:both;"/>
<br/>
接下里我们测试下视频采集卡模块是否正常工作。

* 先检测是否视频采集卡被识别。 

{% highlight bash %}
    apt-get install lsusb    
{% endhighlight %}

运行之后会有如下输出：

    osmc@osmc:~$ lsusb
    Bus 001 Device 004: ID 05e1:0408 Syntek Semiconductor Co., Ltd STK1160 Video Capture Device
    Bus 001 Device 003: ID 0424:ec00 Standard Microsystems Corp. SMSC9512/9514 Fast Ethernet Adapter
    Bus 001 Device 002: ID 0424:9512 Standard Microsystems Corp. LAN9500 Ethernet 10/100 Adapter / SMSC9512/9514 Hub
    Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
    osmc@osmc:~$

*Ltd STK1160 Video Capture Device* 那一行就表示被识别。

* 调试Hyerion V412 Grabber模块。

根据官方文档[V412 Grabber](https://github.com/tvdzwan/hyperion/wiki/V412-Grabber), 我们先通过命令调试下部分参数来确保能得到正确的视频截图。

{% highlight bash %}
    sudo hyperion-v4l2 --width -1 --height -1 --size-decimator 1 --frame-decimator 1 --screenshot
{% endhighlight %}

会得到一个screenshot文件，是左边这样的。


<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12617388/6d6521c4-c54a-11e5-9b40-07e57e6fddc9.png" align="left" height="400" width="400"/>
<img src="https://cloud.githubusercontent.com/assets/491610/12617385/6cd5a300-c54a-11e5-9814-8575ed143069.png" align="left" height="400" width="400" style="margin-left: 20px !important;"/>
</div>
<div style="clear:both;"/>

您看到有黑边，这里我们需要配置crop margin，截取黑边部分，

{% highlight bash %}
sudo hyperion-v4l2 --width -1 --height -1 --crop-top 10 --crop-left 30 --crop-bottom 10 --crop-right 40 --size-decimator 1 --frame-decimator 1 --screenshot
{% endhighlight %}

就得到右边的截图。

# Hyperion配置LED灯带映射 #
<hr/>

到了配置Hyperion的时候了，你可以通过Hyerion的图形化工具来配置。工具的文档[Hyerion Configuration](https://github.com/tvdzwan/hyperion/wiki/Configuration)有详细的工具使用说明，先下载工具[HyperCon_ssh.jar](https://raw.github.com/tvdzwan/hypercon/master/deploy/HyperCon_ssh.jar). 下载到本地之后运行**java -jar HyperCon_ssh.jar**：

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12617405/839201b0-c54a-11e5-95ea-ecd44d8b7976.png" align="left" height="593" width="1000"/>
</div>
<div style="clear:both;"/>
<br/>

>    type: 选择WS2081
    RGB byte order: RGB
    direction: 方向选取逆时针
    Led in top/bottom coners: 因为我们在顶角90度的地方并没有灯叠加，所以都选false
    Horizontal: 水平灯一共有32个
    Vertical: 左右边有19个
    Bottom Gap: 因为底边没有灯，所以设置为顶边的灯数来去掉底边
    1st LED offset: 设置此参数来确保第一个标号0从灯带的输入端开始，也就是右边地下第一个。

后面的Horizontal depth等等可以保持默认。

<div>
<img src="https://cloud.githubusercontent.com/assets/491610/12700894/459a7aca-c830-11e5-9ec9-bc6c51f6d77f.png" align="left" height="593" width="1000"/>
</div>
<div style="clear:both;"/>
<br/>

接下来设置采集卡参数，禁止**Frame Grabber**, 同时开起**GrabberV4L2**, 将下面的参数按照调试的时候填上。
最后点击下面的**Create Hyerion Configuration**,导出*hyperion.config.json*配置文件,并SCP上传到树莓派上。

{% highlight bash %}
scp hyperion.config.json osmc@192.168.1.3:~
登陆到树莓派
cp hyperion.config.json /etc/
sudo /etc/init.d/hyperion stop
{% endhighlight %}

怎么调试了？ 可以运行如下命令来查看输出：

{% highlight bash %}
sudo hyperiond /etc/hyperion.config.json
{% endhighlight %}

会有如下输出：

>    Application build time: Jan 30 2016 16:59:41
    QCoreApplication initialised
    Selected configuration file: /etc/hyperion.config.json
    ColorTransform 'default' => [0; 203]
    Device configuration:
    {
    "colorOrder" : "rgb",
    "name" : "MyPi",
    "output" : "/dev/spidev0.0",
    "rate" : 250000,
    "type" : "WS2801"
    }
    Black border threshold set to 0.1 (26)
    Creating linear smoothing
    Created linear-smoothing(interval_ms=25;settlingTime_ms=200;updateDelay=0
    Effect loaded: Knight rider
    Effect loaded: Blue mood blobs
    Effect loaded: Cold mood blobs
    Effect loaded: Full color mood blobs
    Effect loaded: Green mood blobs
    Effect loaded: Red mood blobs
    Effect loaded: Warm mood blobs
    Effect loaded: Rainbow mood
    Effect loaded: Rainbow swirl fast
    Effect loaded: Rainbow swirl
    Effect loaded: Snake
    Effect loaded: Strobe blue
    Effect loaded: Strobe Raspbmc
    Effect loaded: Strobe white
    Initializing Python interpreter
    Hyperion created and initialised
    run effect Rainbow swirl fast on channel 0
    Boot sequence(Rainbow swirl fast) created and started
    V4L2 width=720 height=480
    V4L2 pixel format=UYVY
    V4L2 grabber signal threshold set to: {25,25,25}
    V4L2 grabber started
    V4l2 grabber created and started
    ...

至此，就表示大功告成。

最后运行**sudo /etc/init.d/hyperion start**来启动Hyerion. 尽情享受流光溢彩Ambilight吧~

# 引用 #
<hr/>

* [Building an Ambilight for your Home Theater](https://randyhammons.com/ambilight-build/)

* [How to build your own Ambilight TV with Raspberry Pi and XBMC](https://christianmoser.me/how-to-build-your-own-tv-ambilight-with-raspberry-pi-and-xbmc/)

* [Ambilight from any video source with a Raspberry](http://www.alessandrocolla.com/ambilight-video-source-raspberry-part-3/)

* [DIY Ambient Lighting with Hyperion. Works with HDMI/AV Sources](http://www.instructables.com/id/DIY-Ambilight-with-Hyperion-Works-with-HDMIAV-Sour/)

* [DIY "Ambilight" effect with Hyperion](https://www.youtube.com/watch?v=tRDAzJrfZiM)

* [Hyerion Github Issues](https://github.com/tvdzwan/hyperion/issues/)





















