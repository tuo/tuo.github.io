---
layout: post
title: "钓鱼的感想(三): 自动钓大鱼"
date: 2021-10-03 12:55:32 +0800
published: true
tags: fishing,life
---



经过第一二部分，已经了解和摸清楚了钓大鱼的一些经验技巧和海竿无人值守需要的准备工作，这部分主要讲解核心部分，展开讲讲如何设计自动检测装置。

这里有两种办法，简单的说：

**第一种是借鉴无杆钓鱼的经验**。无竿钓鱼就没有浮漂，直接将主线的一端绑在岸边的树根或者木棍地插上。可以在主线和地插连接的地方，加一个弹簧，这个弹簧是倾斜接近垂直地放置，当鱼咬钩拉动鱼线，这个拉力会让弹簧往上抬起来，从而形成一个角度差和瞬间的加速度。假设有这么一个装置可以安在弹簧上，并检测角度差值，当这个角度差超过一定的阈值，就会形成触发，可以认为是中鱼。

![sketch_bank](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/sketch_bank.jpg)


**第二种是借鉴手竿钓底的经验**。手竿钓底，一般都会有一个找底调漂的环节。之后当鱼咬钩，就会拉动浮漂上下运动。一般来说是大鱼的话，浮漂的表现的话就是一个*大黑漂* - 浮漂有一个猛烈和迅速的向下的运动，直接浸没到水中。假设有这么一个装置可以安装在这样一个足够大的浮漂的内部，并检测z轴的加速度变化，当这个加速度的变化值超过一定的阈值，就会形成触发，可以认为是中鱼。

![sketch_float](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/sketch_float.jpg)

这两种各自的优势和困难所在：

第一种的优势：

* 装置在岸上，不用考虑防水
* 抛竿流程不受影响， 正常抛竿即可
* 不用考虑风浪，也不用考虑暴晒散热
* 一旦出现挂底，损失比较小，岸上的装置等不受影响

缺点：

* 隐蔽性不高，目标还是有点大， 容易被过路的其他人和钓鱼人发现拿走，不好隐藏 
* 中鱼信号的准确度有所欠缺，要求鱼线需拉直紧绷，能及时在长距离传递信号
* 受岸边地形限制 - 必须有合适的障碍物来伪装隐蔽

第二种的优势：

* 浮漂垂直在钩子的上方，鱼线距离比较短，中鱼信号的准确度高
* 隐蔽性强，因为浮漂在30-50米之外，其他人无法简单地够着，所以不容易被偷窃
* 不受岸边地形限制 - 地插可以在水里也可以是岸上，目标小

缺点：

* 浮漂材质要求比较高，需要既能有好的密闭性能防水也能方便打开，没有类似的现成既有的商品，需要DIY和不断试验
* 风浪 - 需要在大风浪下，水面有波浪的情况下，保持检测的准确度，同时大风浪意味着需要更大的铅坠来保持定位，这样对鱼竿、渔轮都有更高的要求
* 散热 - 在密闭性要求高的情况下，夏天中午太阳直射和水面的反光，会导致浮漂内部温度升高，是否电子元器件可以正常工作？
* 抛竿难度增加，毕竟浮漂本身也有很大的重量加上大的铅坠
* 一旦线断开，极有可能导致浮漂丢失，这样里面的装置都会丢失，损失比较大

这两者来说，第一个相对第二个在实现难度来说还是简单一点，再一个结合我在夏天拍摄的水库岸边的情况（岸边树木草比较多，适合隐蔽），所以选择第一种方案作为切入点。装置势必要体积要小，同时续航起码需要支持一两天，像上一篇博客简要提到的，包括三个部分：陀螺仪(方向)或加速度(角度)的检测的传感器(输入）、中央微处理控制单元模块（大脑）、无线通信模块（输出）。

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/angle_change.jpg" alt="angle_change" style="zoom:50%;display: flex;" />

<cite>当鱼线被拉动，此时弹簧从垂直状态被拉起形成一个夹角，弹簧还可以提供缓冲，防止硬怼硬</cite>

看一下模拟中鱼的动图：

![](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211002fishingpart2%2Ffish_trigger.gif)

## ESP8266 微控制单元

MCU，微控制单元也叫单片微型计算机， 或者简单点说单片机，是装置的核心模块。单片机，简单理解为微型电脑，特点是体积小，功耗低，有不同的通信模式协议来接入不同的外围设备，比如打印机、显示器等等，互相交换数据。

> 单片微型计算机简称单片机，简单来说就是集CPU（运算、控制）、RAM（数据存储-内存）、ROM（程序存储）、输入输出设备（串口、并口等）和中断系统处于同一芯片的器件，在我们自己的个人电脑中，CPU、RAM、ROM、I/O这些都是单独的芯片，然后这些芯片被安装在一个主板上，这样就构成了我们的PC主板，进而组装成电脑，而单片机只是将这所有的集中在了一个芯片上而已。

单片机有很多选择，树莓派Rasperry Pi、Arduino(Uno)、51单片机、STM32等等。树莓派太贵，最低两百多，针对我们的场景显得有点大材小用；Arduino也是前些年非常流行的开发板，C/C++语言开发；51单片机、STM32也是出现在各个教材的经典基本通用单片机/开发板，这些也都不错。但是近些年却非常流行一款国产乐鑫的[ESP8266](https://www.espressif.com/zh-hans/products/services)系列模组，面向物联网的高性价比（10多块钱）、高度集成的自带WIFI的开发板，比较适合我们这个场景。

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/tb_nodemcu.png" alt="Screenshot 2021-10-29 at 14.32.51" style="zoom:50%;display: flex;" />

这里买的是*ESP8266串口WIFI模块 NodeMCU Lua V3物联网开发板 CH340 CP2102*中的CH340版本，CH340代表是USB串口驱动的型号。这里后续的代码和操作也都是是在Mac的系统上，先去这里[CH340 Drivers for Windows, Mac and Linux](http://www.wch.cn/downloads/CH341SER_MAC_ZIP.html)下载并安装好对应系统的驱动。用microusb连接板子和电脑之后，去到终端输入ls /dev/tty.*记住对应的设备名称。

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/lsdevtty.png" alt="lsdevtty" style="zoom:33%;display: flex;" />

NodeMCU 是一款开源的物联网开发平台，支持各种固件系统，比如淘宝上提到*NodeMCU Lua V3*，也就是基于脚本语言Lua的NodeMCU，还有其他比较流行的MicroPython(Python)、Mongoose OS(NodeJS)等等。这些在系统底层的基础上加了一个解释器，可以直接修改代码而快速的调试，而不用每次改动都编译为底层汇编字节码并上传Flash，后者这样开发调试的速度实在太慢了。

![nodemculua](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/nodemculua.png)

<cite>左边是解释器的原理，右边是传统编译上传的终端输出，速度感人</cite>

这里要注意到这些解释器并不是完整实现了对应语言的全部特性，只是该语言的一部分。NodeMCU的Lua基于[eLua](https://zh.wikipedia.org/w/index.php?title=ELua&action=edit&redlink=1)，对应的Lua版本是5.1，不是5.3， 根据官方的文档[NodeMCU Lua Developer FAQ](https://nodemcu.readthedocs.io/en/release/lua-developer-faq/)，math库就没有完整的实现，比如没有atan 反正切函数，导致后续在使用MPU6050计算角度时候就受到这个的限制。同时社区不是很成熟，资料并不是非常完备。

绕过解释器，直接原生的做法也很简单，配置一下Arduino IDE的ESP8266的库和框架环境即可。原生的方式好处在于：不用刷解释器的系统固件；不受解释器的限制，直接C/C++编程，可以利用Arduio非常强大成熟的社区资料，这一点在MPU6050这块角度加速度的计算上特别有用。缺点在于：每次修改代码哪怕只是一个字母一行代码，都需要编译上传，这个速度比较慢，哪怕我已经将*Tools -> Upload Speed*的上传速度值设置为最大，能快了那么一点点，但是还是费时，整个开发体验还是有点点差，基本是改->等、改->等、改->等的节奏。

但是了，作为新手，还是选择基于lua的nodemcu更加容易上手，开发体验也更好些，后续了解的更多，还是可以方便的切回到Arduino IDE的嘛。

**第一步 烧录系统**。 可以去到官方的https://nodemcu-build.com/选择哪些需要支持的模块， 选择哪些模块可以去[NodeMCU的官方文档NodeMCU Documentation](https://nodemcu.readthedocs.io/en/release/)，先了解下基本的原理，了解下基本的Lua的语法，看看自己需要哪些模块。特别是[Getting Started aka NodeMCU Quick Start](https://nodemcu.readthedocs.io/en/release/getting-started/)。我这里选择了 *bit, file, gpio, i2c, net, node, softuart, tmr, uart*， 标准的库有bit位操作、tmr时间、i2c是跟MPU6050通信的串口协议、softuart用来跟SIM800C通信的协议。然后去连接ESP8266开发板，打开NodeMCU PyFlasher并选择上一步下载的bin文件，烧录到开发板上即可。

**第二步 编程调试**。推荐的编程环境是ESPlorer IDE，直接运行下载来的JAR包即可。唯一在MAC上面要注意的问题是： 串口设备下拉表里无法选择目标ESP8266的设备，需要去设置settings，手动固定死ESP8266对应的串口设备名称。编程的IDE支持相当简陋，推荐VSCode，然后稍微注意下左下角的save/send to esp按钮，用来上传导入或保存lua代码文件到开发板之后，右边的FS info可列出出来当前单片机上的lua文件都有哪些。

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/ESPlorerIDE_advanced.jpeg" alt="ESPlorerIDE_advanced" style="zoom:50%;display: flex;" />

要注意的是，nodemcu上电复位后会自动执行init.lua 这个入口文件。如果没有的话， 右边串口终端会输出  *can't open init.lua*，手动创建一个init.lua,在里面引用其他的模块或者文件-这里是处理mpu6050和sim800C的代码即可，可以参考官方文档的[init.lua说明](https://nodemcu.readthedocs.io/en/release/upload/#initlua)。

NodeMCU还是非常好上手的，特别是自带了wifi模块，可以尝试从简单点亮板载LED到读取外设传感器比如测量温湿度的DHT11温湿度模块（7块钱）的值并通过WIFI上传到服务器上，对照着nodemcu的文档和教程，一步步摸索和熟悉下基础的单片机知识。


## MPU6050 - 角度加速度六轴传感器

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/tb_mpu6050.png" alt="Screenshot 2021-10-29 at 14.35.47" style="zoom:67%;display: flex;" />

从上面购买的名字可以看到-*MPU-6050模块 三轴加速度 三轴陀螺仪 6DOF模块 GY-521 六轴姿态*，包含了加速度、陀螺仪很温度检测的功能，能帮助做倾斜角度的检测，价格也很便宜5-6块左右，当然还可以选择功能更全带卡尔曼滤波算法的JY61模块，但是目前没有啥必要。

> MPU6050传感器是一个集成了6轴运动跟踪装置的模块，分别是3轴陀螺仪和3轴加速度计，同时集成了数字运动处理器和温度传感器。通过I2C总线，他还可以接受来自其他传感器的输入，如3轴磁力计或压力传感器，因此如果将MPU6050与外部的3轴磁力计连接起来，它就可以提供完整的9轴输出了。

要了解MPU6050之前，最好了解下各种串口的通信协议，在这里将会使用到的是I2C和UART。 接下里需要了解MPU6050这个传感器，推荐先简单从的输出角速度、加速度和温度值开始，先照着代码敲一遍，跑起来看到输出，在回过头看代码并对照[MPU6050系列技术手册datasheet](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Register-Map1.pdf)加深理解。

**基本上每一个单片机、元器件、传感器都会有对应的技术手册，这个技术手册非常重要，否则心急吃不了热豆腐，容易陷入坑里。**

关于I2C可以这么比喻，与之通信的传感器或者元器件相当于一个快递柜（比如蜂巢或者京东），每个快递柜有很多格子，每个格子可以放东西，这个东西可以是快递人放的，收货人去取，也可以是寄货人放的，快递员去取。当你需要给这个元器件设置它的一些属性时，你就往预定的对应的格子存东西 - 写入(Write)。元器件往某些特定格子读取这些设置随后运行中产生了数据就放到了其他的一些格子中。当你需要从元器件读取某些数据时，你就去对应的格子取里面的货物即可 - 读取(Read)。每个格子都有它的编号，这个快递柜也是有它自己的编号。对应过来，这些格子就是寄存器，你只需要去它的数据手册里找到对应的寄存器的说明即可，而快递柜的编号也就是该传感器的I2C从机设备的地址，这个高7位是固定的，也就是默认的`0x68`，最后一位由引脚AD0决定。

![Screenshot 2021-10-27 at 19.40.32](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/register_slave_addr.png)

<cite>来自MPU6050的技术手册在4.32章节，MPU6050有很多地方需要查看技术手册 </cite>

找好了MPU6050的设备地址，接下来I2C写入： 就是找到对应的寄存器地址往其中写入设置合适的初始值，这里有电源管理、陀螺仪的满量程范围、加速度传感器的满量程范围。后面两个会影响到后续读取出来数值的计算，建议可以对照着数据手册看。I2C读取： 主要是陀螺仪数据输出寄存器、加速度传感器数据输出寄存器以及温度传感器数据输出寄存器，分别获取陀螺仪（in  degree/seconds unit)、加速度（ in g unit）和温度（ in degree/celcius）的原始数据，要注意它的单位。

```lua
-- https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Register-Map1.pdf
id  = 0 
scl = 7 
sda = 6 
MPU6050SlaveAddress = 0x68
AccelScaleFactor = 4096;  --8g/s
GyroScaleFactor = 65.5; -- ± 500 °/s

MPU6050_REGISTER_SMPLRT_DIV   =  0x19
MPU6050_REGISTER_USER_CTRL    =  0x6A
MPU6050_REGISTER_PWR_MGMT_1   =  0x6B
MPU6050_REGISTER_PWR_MGMT_2   =  0x6C
MPU6050_REGISTER_CONFIG       =  0x1A
MPU6050_REGISTER_GYRO_CONFIG  =  0x1B
MPU6050_REGISTER_ACCEL_CONFIG =  0x1C
MPU6050_REGISTER_FIFO_EN      =  0x23
MPU6050_REGISTER_INT_ENABLE   =  0x38
MPU6050_REGISTER_ACCEL_XOUT_H =  0x3B
MPU6050_REGISTER_SIGNAL_PATH_RESET  = 0x68
 
function I2C_Write(deviceAddress, regAddress, data)
    i2c.start(id)       -- send start condition
    if (i2c.address(id, deviceAddress, i2c.TRANSMITTER))-- set slave address and transmit direction
    then
        print("write")
        i2c.write(id, regAddress)  -- write address to slave
        i2c.write(id, data)  -- write data to slave
        i2c.stop(id)    -- send stop condition
    else
        print("I2C_Write fails")
    end
end

function I2C_Read(deviceAddress, regAddress, SizeOfDataToRead)
    response = 0;
    i2c.start(id)       -- send start condition
    if (i2c.address(id, deviceAddress, i2c.TRANSMITTER))-- set slave address and transmit direction
    then
        i2c.write(id, regAddress)  -- write address to slave
        i2c.stop(id)    -- send stop condition
        i2c.start(id)   -- send start condition
        i2c.address(id, deviceAddress, i2c.RECEIVER)-- set slave address and receive direction
        response = i2c.read(id, SizeOfDataToRead)   -- read defined length response from slave
        i2c.stop(id)    -- send stop condition
        return response
    else
        print("I2C_Read fails")
    end
    return response
end

function unsignTosigned16bit(num)   -- convert unsigned 16-bit no. to signed 16-bit no.
    if num > 32768 then 
        num = num - 65536
    end
    return num
end
function MPU6050_Init() --configure MPU6050
    tmr.delay(150000) -- delay for 150 ms
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_SMPLRT_DIV, 0x07)
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_PWR_MGMT_1, 0x01)
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_PWR_MGMT_2, 0x00)
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_CONFIG, 0x00)
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_GYRO_CONFIG, 0x08)-- set +/-500 degree/second full scale
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_ACCEL_CONFIG, 0x10)-- set +/- 8g full scale  
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_FIFO_EN, 0x00)
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_INT_ENABLE, 0x01)
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_SIGNAL_PATH_RESET, 0x00)
    I2C_Write(MPU6050SlaveAddress, MPU6050_REGISTER_USER_CTRL, 0x00)
end
i2c.setup(id, sda, scl, i2c.SLOW)   -- initialize i2c
MPU6050_Init()
tmr.delay(1000)]

while true do   --read and print accelero, gyro and temperature value    
    data = I2C_Read(MPU6050SlaveAddress, MPU6050_REGISTER_ACCEL_XOUT_H, 14)
    AccelX = unsignTosigned16bit((bit.bor(bit.lshift(string.byte(data, 1), 8), string.byte(data, 2))))
    AccelY = unsignTosigned16bit((bit.bor(bit.lshift(string.byte(data, 3), 8), string.byte(data, 4))))
    AccelZ = unsignTosigned16bit((bit.bor(bit.lshift(string.byte(data, 5), 8), string.byte(data, 6))))
    Temperature = unsignTosigned16bit(bit.bor(bit.lshift(string.byte(data,7), 8), string.byte(data,8)))
    GyroX = unsignTosigned16bit((bit.bor(bit.lshift(string.byte(data, 9), 8), string.byte(data, 10))))
    GyroY = unsignTosigned16bit((bit.bor(bit.lshift(string.byte(data, 11), 8), string.byte(data, 12))))
    GyroZ = unsignTosigned16bit((bit.bor(bit.lshift(string.byte(data, 13), 8), string.byte(data, 14))))
 
    -- ACC in g unit, Temp  in degree/celcius, Gyro in degree/celcius
    AccelX = AccelX/AccelScaleFactor   -- divide each with their sensitivity scale factor
    AccelY = AccelY/AccelScaleFactor
    AccelZ = AccelZ/AccelScaleFactor
    Temperature = Temperature/340.0+36.53-- temperature formula
    GyroX = GyroX/GyroScaleFactor
    GyroY = GyroY/GyroScaleFactor
    GyroZ = GyroZ/GyroScaleFactor
    
    print(string.format("TUO-Ax:%.3g Ay:%.3g Az:%.3g T:%.3g Gx:%.3g Gy:%.3g Gz:%.3g",
                        AccelX, AccelY, AccelZ, Temperature, GyroX, GyroY, GyroZ))
    tmr.delay(100000)   -- 100ms timer delay
end
```
<cite>参考[mpuTest.lua](https://github.com/NorthernMan54/homebridge-wssensor/blob/master/nodemcu/mpuTest.lua)</cite>

最后看看ESP8266是如何跟MPU6050的连线的：

![mpu6050_wire_final copy](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/mpu_2_mcu.png)

<cite>注意接地和正极VCC别搞错了，否则容易损坏，建议给杜邦线设计专门用途的颜色，比如正极是红色，接地是黑色等等</cite>

这里实际中要把这个传感器贴在弹簧上，其实只需要关注acc一个x轴上面即可，每个一秒钟读取数据，观察是否大于某一个阈值。

![ESPlorer_Output_window](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/esplore_output.png)

如果要想实现第二种设置，也就是将单片机放到浮漂球内部，就需要获取在z轴方向的加速度变化，这种情况跟上面的差不多，基本都是简单原始获取的值就足够用了。

![rollpitchyaw](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/rollpitchyaw.png)

如果需要做一些复杂的姿态解算，那就需要复杂点的向量计算。这两个文章[《MPU-6050 6dof IMU tutorial for auto-leveling quadcopters with Arduino source code - Part 1》](https://www.youtube.com/watch?v=4BoIE8YQwM8&t=636s&ab_channel=JoopBrokking) 和[《MPU-6050 6dof IMU tutorial for auto-leveling quadcopters with Arduino source code - Part 2》](https://www.youtube.com/watch?v=j-kE0AMEWy4&ab_channel=JoopBrokking)非常详细解释了MPU6050工作原理，以及如何过滤噪音，和平衡角度等等比较高级的用法，作者的最终目的用这个来控制无人机，精确度要求高，值得学习下。

可以取其中一段核心代码片段看看：

```c
//source: http://www.brokking.net/imu.html MPU-6050 6dof IMU for auto-leveling multicopters

//Gyro angle calculations: 0.0000611 = 1 / (250Hz / 65.5)
angle_pitch += gyro_x * 0.0000611; //Calculate the traveled pitch angle and add this to the angle_pitch variable
angle_roll += gyro_y * 0.0000611;  //Calculate the traveled roll angle and add this to the angle_roll variable

//0.000001066 = 0.0000611 * (3.142(PI) / 180degr) The Arduino sin function is in radians
angle_pitch += angle_roll * sin(gyro_z * 0.000001066); //If the IMU has yawed transfer the roll angle to the pitch angel
angle_roll -= angle_pitch * sin(gyro_z * 0.000001066); //If the IMU has yawed transfer the pitch angle to the roll angel

//Accelerometer angle calculations
acc_total_vector = sqrt((acc_x * acc_x) + (acc_y * acc_y) + (acc_z * acc_z)); //Calculate the total accelerometer vector
//57.296 = 1 / (3.142 / 180) The Arduino asin function is in radians
angle_pitch_acc = asin((float)acc_y / acc_total_vector) * 57.296; //Calculate the pitch angle
angle_roll_acc = asin((float)acc_x / acc_total_vector) * -57.296; //Calculate the roll angle

//Place the MPU-6050 spirit level and note the values in the following two lines for calibration
angle_pitch_acc -= 0.0; //Accelerometer calibration value for pitch
angle_roll_acc -= 0.0;  //Accelerometer calibration value for roll

if (set_gyro_angles){  //If the IMU is already started
    angle_pitch = angle_pitch * 0.9996 + angle_pitch_acc * 0.0004; //Correct the drift of the gyro pitch angle with the accelerometer pitch angle
    angle_roll = angle_roll * 0.9996 + angle_roll_acc * 0.0004;  //Correct the drift of the gyro roll angle with the accelerometer roll angle
}else{  //At first start
    angle_pitch = angle_pitch_acc; //Set the gyro pitch angle equal to the accelerometer pitch angle
    angle_roll = angle_roll_acc;   //Set the gyro roll angle equal to the accelerometer roll angle
    set_gyro_angles = true;        //Set the IMU started flag
}
//To dampen the pitch and roll angles a complementary filter is used
angle_pitch_output = angle_pitch_output * 0.9 + angle_pitch * 0.1; //Take 90% of the output pitch value and add 10% of the raw pitch value
angle_roll_output = angle_roll_output * 0.9 + angle_roll * 0.1;    //Take 90% of the output roll value and add 10% of the raw roll value
```

<cite>来自上面的[MPU-6050 6dof IMU for auto-leveling multicopters](http://www.brokking.net/imu.html)</cite>

这里有几个函数并不在NodeMCU对应的Lua版本支持之中。[How is NodeMCU Lua different to standard Lua?](https://nodemcu.readthedocs.io/en/dev/lua-developer-faq/#how-is-nodemcu-lua-different-to-standard-lua) 提到*math*这个标准库是被忽略没有包含进去的，所以这个sin/cos/asin/acos/atan2都是没有的，只能是自己手动写一个lua的标准math库的函数.

所以这里就体现出来用原始点的C/C++写的好处来了，Arduio社区资料非常丰富，关于计算Roll, Yaw, Pitch这块，论坛里有非常多的讨论和代码，比如[Converting Raw data from MPU 6050 to YAW,PITCH AND ROLL](https://forum.arduino.cc/t/converting-raw-data-from-mpu-6050-to-yaw-pitch-and-roll/465354)、[Converting rotation angles from MPU6050 to roll/pitch/yaw](https://forum.arduino.cc/t/converting-rotation-angles-from-mpu6050-to-roll-pitch-yaw/392641)、 [YAW Calculation from MPU6050](https://forum.arduino.cc/t/yaw-calculation-from-mpu6050/317028)等等，都是基于Arduino用C/C++所写；另外有很多代码和功能甚至封装了起来，作为独立的库提供到用户使用 ，这篇文章里[《Gyro (Position) sensors (MPU6050) with Arduino – How to access Pitch, Roll and Yaw angles》](https://www.xtronical.com/mpu6050/)编译封装了一个单独的库 [rfetick/MPU6050_light](https://github.com/rfetick/MPU6050_ligh)，只需要在头部导入`#include <MPU6050_light.h>`，直接可以通过*mpu.getAngleX()*、*mpu.getAngleY()*、*mpu.getAngleZ()*直接拿到对应的角度，开箱即用。这个在NodeMCU和MicroPython这块，还是没有对应的那么成熟丰富的社区的。

这部分输入检测的代码就差不多实现了，接下来是无线通信的输出部分。



## SIM800C - 无线通信模块

如何在野外如何将中鱼的信号发出去了？ 首先MCU自带的wifi是用不上的，只能是借助手机数据网络。手机网络发展到现在就好几代了，目前是5G，大概的[迭代路线](https://www.zhihu.com/question/26471222/answers/updated)是：

> G(GPRS)→E(EDGE)→3G(WCDMA)→
> H(HSPA)→H+(HSPA+)→4G/LTE(LTE-FDD/TDD)
>
> G,E属于2G，3G,H属于3G，H+,4G/LTE属于4G，速度依次增快。
> 这几种网络使用感受上的最大区别当然就是速度和可以传输数据的类型不同，比如2G主要是语音业务，2.5G就可以传送数据业务，3G达到快速数据业务传输，H使数据速率更高，LTE提高了容量减小了延迟，实现全数据网络等等

对比分析下，就知道我们这个传输数据的场景其实数据量非常之小，可能不到几kb，频率也不会太高，所以听起来2G - GRPS网络就足够了，而且价格还便宜。目前已有的物联网IoT很多通讯网络还是使用的2G，但是现在三大运营商已经开始清退2G网络了给5G让路，所以足够预算够还是建议不用2G，有可能出现买了插上之后没有2G信号。 

>  **根据移动最新政策显示，将于2020年底前停止新增2G物联网用户，2021年不再发放2G物联网卡，并将由NB-IoT、4G Cat1/1bis技术承接2G物联网用户。**

> 这个主要是看你用模块干什么了
>
> 如果你要是用模块打电话、发短信、上网，你就用4G模块，我知道的有Air720H、SIM7600CE、WH-LTE-7S5
> 如果你要是没有打电话发短信的需求，只是用来上网，你可以选NB-IoT模块或eMTC模块。NB-IoT模块很便宜，而且国家重点扶持这个技术。NB-IoT型号特别多，你自己上淘宝上一搜一大把。

实际上NB-IoT模块却不便宜，我们对比下基于2G的GRPS模块Sim800c、基于NB-IoT替换sim800c的SIM7020C和4G Cat1的Air724U

![sim800_all](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/tb_sim800_all.png)

结合这个项目需求来看，那还是sim800c比较划算，如果预算够的话，建议上右边两个。

SIM800C可以通过AT指令发送命令，可以先连接电脑，调试一下基本的指令。这个时候需要一个USB-TTL调试模块、一个手机sim卡、可能还需要一个Nano卡槽和Sim800c模块。SIM800C插好手机卡，然后使用USB-TTL连接SIM800C然后插入电脑供电，观察到电源指示灯亮起之后，用跳线帽或者杜邦线将PWX和GND短接，给到一个低电平给PWX来出发启动模块，这个时候模块才会开始工作。调试时特别注意下LED闪灯频率，这个可以区分模块的工作状态。

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/sim800_usbttl.jpeg" alt="sim800_at" style="zoom:67%;display:flex" />

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/sim800_coolterm.jpeg" alt="sim800_at" style="zoom:80%;display:flex" />

这里Mac系统的串口调试工具建议使用[CoolTermMac](https://learn.sparkfun.com/tutorials/terminal-basics/coolterm-windows-mac-linux)，设置好串口设备的端口(Serial Port Options)的Port、终端断行模式(Line Mode)和View ASCII文本显示。

特别要注意SIM卡和卡槽的方向： AT+CPIN? 可以查看SIM卡是否准备就绪，如果返回：ERROR，要么SIM卡插入方向错误，要么SIM卡异常。 同时请确认手机卡是否启用了无线网络，否则http请求无法成功。

SIM800C可以接受哪些AT指令，建议大家参考下它的数据手册，但是中文的数据手册在线的没有找到，只有这个勉强能用[《SIM800C系列用户使用手册》](**https://pan.baidu.com/s/1skLxRI1**)，一般来说你购买的淘宝店家应该会给到你一份手册。我们这里用到的包括打电话和每个一分钟发送一次MPU6050采集的角速度加速度温度信息到服务器方便后续排查和调试。下面是连线示意和SIM800代码：

> MCU  - SIM800C
>
> RX(D3) - TX
>
> TX(D2) - RX
>
> GND <-> GND
>
> VCC <-> VBAT

代码：

```lua
---- Create new software UART with baudrate of 9600, D2 as Tx pin and D3 as Rx pin
function writeCMD(s, cmd)
    print("\n"..tostring(tmr.now())..": send cmd", cmd);    
    s:write(cmd.."\n");   
end

function sim_setup()
    if not s then 
        print("\n"..tostring(tmr.now())..": initilized su\n");
        s = softuart.setup(9600, 2, 3)
        s:on("data", "\n", function(data)
          local txt = string.gsub(data, "[\r\n]", "")
          print("\n"..tostring(tmr.now())..": receive from uart:", txt)
          local pattern = "^HTTPACTION"
          if txt:find(pattern) ~= nil then
              print("\n"..tostring(tmr.now())..": RECIEVED HTTP ACTION DONE:", txt)
              writeCMD(s, 'AT+HTTPTERM')
    --          writeCMD(s, 'AT+SAPBR=0,1')
          end       
        end)
    else
      print("\n"..tostring(tmr.now())..": existed su\n");  
    end
end
function sim_send(txt)
    writeCMD(s, 'AT+SAPBR=3,1,"Contype","GPRS"')
    writeCMD(s, 'AT+SAPBR=3,1,"APN","CMNET"')
    writeCMD(s, 'AT+SAPBR=1,1')
    writeCMD(s, 'AT+SAPBR=2,1')
    writeCMD(s, 'AT+HTTPINIT')
    writeCMD(s, 'AT+HTTPPARA="CID",1')
    local url = "xxxx.com/api/dashboard?time="..tostring(tmr.now().."&txt="..txt)
    writeCMD(s, 'AT+HTTPPARA="URL","'..url..'"')
    writeCMD(s, 'AT+HTTPACTION=0')
    s:write(0x1a);  
end

function sim_call()   
    writeCMD(s, 'ATD186xxxx5235;')    
end
```

<cite>代码在gist上面: [sim800_http.lua](https://gist.github.com/tuo/67b6826971d63fd5fba7f81795083c2d)</cite>

这里将MPU6050的信息拼成一个字符串txt，然后直接通过最简单的GET方法，发送到后端，在后端可以看到如下日志：

![](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/server_log_check.png)

可以看到当我把MPU6050贴在弹簧上，模拟被鱼拉动而将弹簧抬起来的时候，在acc_x上面有一个明显的差值，这个差值多调试几次就可以找到合适的出发阈值。

### 常见问题 - SIM800自动关机、工作不稳定

然而在实际测试之中，经常会碰到一个问题: 无法稳定正常的工作，或者是搜索不到信号，或者板载的LED闪的频率不稳定，甚至有时候干脆自动关机。这个问题在论坛和youtube下面经常看到，甚至不少人因此放弃了Sim800这个方案。

这个问题，跟编程在运用新框架新技术会碰到的某些问题其实很类似，某段代码或者逻辑体现出来比较诡异奇怪，这个时候一般的思路是将问题拆分定位到某个小的范围，第二个就是回归文档，当你有了一定代码实践的积累，有时候容易忽略文档，但是这些时候往往要慢下来，回归到文档上面，可能有时候能事半功倍，否则容易陷入无头苍蝇抓瞎的处境。

SIM800跟ESP8266 MCU通信是通过TTL电平的方式，也就是高电位是1，低电位是0， 这样就可以组合以二进制的方式在双方之间传递数据信息。这就意味着这单片机和Sim800必须有相同的板载电压作为高低压，低电位好理解，都是接地。

查阅ESP8266的[技术手册datasheet](https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_cn.pdf)在第19页的5.1电气特性这块可以知道：

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/sim800_datasheet.png" alt="Screenshot 2021-10-28 at 17.57.51" style="zoom:33%;display:flex" />

<cite>虽然这里是ESP8266的技术手册，但是需要指出的是，后续SIM800技术手册也是非常重要的，里面提到了一些常见的问题和解决思路，需要特别注意的点，里面就已经写的清楚明白了</cite>

从上面看的出来，SIM800工作电压范围2.5-3.6V，经过自带的LDO板载稳压之后板子的电压是3.3V。 按照上面的连线，那么SIM800C的接入的电压也是3.3V，这时两者的电压才会相同。 

查阅SIM800的技术手册datasheet在第20页的4.1供电这块可以知道：

> 4.1
>
> 模块VBAT的电压输入范围是3.4V到4.4V，推荐电压为4.0V。模块以最大功率发射时，电流峰值瞬间 最高可达到2A，从而导致在VBAT上有较大的电压跌落。
>
> 电源要能够提供足够的峰值电流以保证 在突发模式时高达 2A 的峰值耗流。
>
> 4.1.1
>
> 在用户的设计中，请特别注意电源部分的设计，确保即使在模块耗电流达到2A时，VBAT的跌落也不 要低于3.4V。如果电压跌落低于3.4V, 模块可能会关机。

在数据传输突发期间，模块的最大电流消耗约为2A， 这个时候就需要电源能提供一个2A的浪涌电流，否则板载电压将会下降（功率不够），导致自动关机。很明显，如果SIM800C的电源是由ESP8266提供的话，不管是电压还是电流都不足以支持突发浪涌的情况。 官方的技术手册在4.1供电这块提供了两个解决办法：

#### 第一个： 5V降压LDO

​		使用5v的电源，用额定2A的DC-DC降压转换器比如LM2596(2块钱左右，可输出高达3A的电流)，将输出连接到SIM800C的VBAT。

#### 第二个： 使用单独的3.7锂电池（推荐）

​		技术手册里在章节*4.1.1*里提到`客户可以直接用3.7V的锂离子电池给模块供电`。这里可以用18650锂电池，2000mAh左右或者往上的大容量功率，能够确保在2A的峰值电流下，还能保持正确的电压范围。



![full_wire](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/wire_sketch.png)


这里展示完整的各个模块连接起来完整的样子，同时我们将*init.lua*修改下加上读取mpu6050的加速度角度值，和发送sim800c的代码，（完整代码在github [tuo/auto_carp_fishing](https://github.com/tuo/auto_carp_fishing))就算基本完成了。

可以看到我们使用两个单独的3.7v的18650的电池（一个电池大概8-9块），一个单独给sim800C供电，一个是给MCU ESP8266单片机；要注意电池连接单片机上的引脚应该是VBAT，而不是VCC。 VCC是板载的电压，设计是不能超过3.3V，而18650的输出是3.7V ，所以要接到VBAT/VIN(5v)这个引脚。

![fullwired2](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/real_wire.jpg)



### 电池续航可以使用多久？

MPU6050每隔2秒读一次数据，每隔1分钟发送一次HTTP请求，大概2500mA的电池可以支持两天没有问题，这个足以符合我们当初设想的要求。关于电池放电这块，需要了解电池的放电曲线[measured discharge curves for 18650 cells](http://www.candlepowerforums.com/vb/showthread.php?308451-18650-battery-test-with-capacity-curves-for-many-cells) ，也就是随着时间输出电压是下降的, 当下降到一定电压时，就无法给模块提供足够的电量。

要延长续航时间有几个办法：

* 换更大的电池比如3300mA的
* 其他更细的技术的电池比如基于Lipo， 18650是基于Lithium-Ion [Lithium-Ion (18650 cells) versus Lipo -- which is best?](https://www.youtube.com/watch?v=ltUIU79O3Gc&ab_channel=RCModelReviews)
* 拉长采样时间 - 比如每隔2秒可以是5秒，1分钟可以是5分钟等等
* 中断 - 与其不断去询问数据并计算没有超过阈值，可以用中断的思路，设置好阈值，只有当传感器的对应数值超过阈值时，才会跟通知单片机
* 单片机有低功耗模式 - 可以参考技术手册，根据实际调整


## 实战的问题

选择第一种方式，将装置放在岸上，是因为其相对而言比较简单一点。我开始考察并有次想法的时候是在夏天7-8月份，可以看一下当时的水库岸边的情况，水库水位很高，离山体一侧的树木和草丛比较近，此时我觉得用第一种方式很好办，比较好隐藏装置，而且岸边没办法可以让人走动通过，所以不存在被别人绊住脚或者轻易的发现。

但是当我买好了海竿渔轮鱼线钩子，并调试好了装置，准备去水库边大干一场时候，当时已经是9-10月份，发现水库的水退了巨多，此时已经水离岸边的上面的树木草丛那块有好大一段距离，都是碎石，人可以很方便的走来走去，架设装置的难度太高了，找不到合适的地点。

![season_change](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/season_change.png)

无奈，只能选择第二种难度更高的方案。第二个方案有一个关键性的问题就是：装置需要安在浮漂里面，这个浮漂必须容易打开取出来，然后还能放进去，并且在水里能密封放水。

关于这个球，浮漂球，是什么样子，我搜索了一下，只有一个[RoboSpace Sphero sprk+可编程机器人 教育入门遥控机器球](https://item.jd.com/41851228516.html)比较接近我的预想。

 <img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/ball_minic2.png" alt="ball_minic" style="zoom:50%;" />

但是可惜直径太小73MM，都不够放下电池盒子，要完整放得下，直径最少的10CM以上。

 淘宝没有现成的商品，只能找到比较相似的是这种球 -  [112扭扭蛋盒盲盒外壳圆形蛋高清透明扭蛋球奶白色球形模具可打开](https://item.taobao.com/item.htm?spm=2013.1.20141001.2.4183751eAivZdc&id=649502814052)，扭蛋机用来装展览展示的物品用的，中间有两个罗文，可以拧上和关闭，但是因为它的作用是为了展览，通用的模型，所以这个防水，也就是中间罗文并不严丝合缝，浸没在水里，毫无疑问肯定是要漏水的。

<img src="https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/real_ball.jpg" alt="ball_reference" style="zoom:50%;" />

第一个难题是防水。 关于中间拧紧和扭开的缝隙处的防水问题，我想到也许可以使用热胶枪解决。当把装置放入这个球并拧上之后，用热胶枪给缝隙处罗文处涂一层胶，放置一会干燥之后在下水，应该可以保持一定的防水效果。

第二个难题是如何将这个球上到主线上。因为这个球没有一个扣，或者凸起的钩子什么，就是一个光滑的表面，如何跟太空豆连接了。这里需要在球的底部，钻一个小孔，然后用其他的塑料制作一个提环类似的模具，再穿过去卡住，再用AB胶粘住，晾干24小时定型，保证这个环的强度和防水性。

第三个难题是抛竿。 因为本身球和元器件特别是两个电池的重量，再加上铅坠和水溶袋，那么这个总的重量是比较大的，对一个杆子的硬度和长度都会提高。同时在抛竿时保证浮球内部组件不松动，所以需要在球的内部安装一些锚点，能较好的固定住电子元器件，保证杜邦线这个连接头能不脱落。

第三个难题是否可以抗风浪和暴晒。如果风浪比较大，容易带着浮漂晃动，甚至拉扯铅坠拖着跑。这个时候只能加大铅坠的重量，这样一来有会碰到第三点的难题。同时在夏天中午高温暴晒和下雨天的暴雨，能否保住元器件是否能正常工作和不进水，这都是挑战。

不过这些都可以在后面慢慢实验，在过程中不断修正，一些工具比如胶水、扭蛋球等等都在路上，后面我也会保持这篇文章的及时更新。


## 更新 后续一

用触碰式开关YL-99替代mpu6050六轴感应- 使用橡皮筋增加缓冲，可以延长碰撞的时间，


> 223.104.210.120 - - [11/Dec/2021:14:52:07 +0800] "GET /api/dashboard?time=3878805&idx=init%20colided:false HTTP/1.1" 301 169 "-" "SIMCOM_MODULE"

> 223.104.210.120 - - [12/Dec/2021:16:36:14 +0800] "GET /api/dashboard?time=305340902&idx=542,collided=false HTTP/1.1" 301 169 "-" "SIMCOM_MODULE"

poling every 1 seconds form switch; sending every 3 minutes gps signals - 2500mAh - support like 25-26 hours


## 淘宝购买的部件清单

没有找到所有的，但是差不多都在这了，总体价格最后没多少钱，基本上都是性价比不错的,PDD里买的物件的质量比我想象的好 :)

![](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20211003fishingpart3/taobao_all1.jpg)



## 资料参考

* Source Code on Github 源代码(C&Lua)： [tuo/auto_carp_fishing](https://github.com/tuo/auto_carp_fishing)

* [ESP8266 Datasheet技术参考手册›](https://www.espressif.com/sites/default/files/documentation/esp8266-technical_reference_cn.pdf)

* [SIM800C Datasheet技术手册](https://www.elecrow.com/download/SIM800C_Hardware_Design_V1.02.pdf)

* [MPU6050 Datasheet技术手册](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Register-Map1.pdf)

  

* 网站: [Last Minute Engineers](https://lastminuteengineers.com/)

* 网站: [The IOT Projects](https://theiotprojects.com/)

* 论坛: [Arduino Forum](https://forum.arduino.cc/)

* 论坛: [DFRobot Forum](https://mc.dfrobot.com.cn/featured/arduino)

  



## 引用

* [IoT Fall detection using MPU6050 NodeMCU ESP8266 and Blynk App](https://theiotprojects.com/iot-fall-detector-using-mpu6050-esp8266/)

* [Measure Pitch Roll and Yaw Angles Using MPU6050 and Arduino](https://theiotprojects.com/measure-pitch-roll-and-yaw-angles-using-mpu6050-and-arduino/)

* [Time to Say Goodbye to Arduino and Go On to Micropython/ Adafruit Circuitpython?](https://www.youtube.com/watch?v=m1miwCJtxeM&t=744s&ab_channel=AndreasSpiess)

* [Send Receive SMS & Call with SIM800L GSM Module & Arduino](https://lastminuteengineers.com/sim800l-gsm-module-arduino-tutorial/) 有一个中文的翻译[https://zhuanlan.zhihu.com/p/340184360](https://zhuanlan.zhihu.com/p/340184360)

* [Interface MPU6050 Accelerometer and Gyroscope Sensor with Arduino](https://lastminuteengineers.com/mpu6050-accel-gyro-arduino-tutorial/)

* [SIM900/SIM800 not working – Possible reasons – Tips n Tricks](https://www.raviyp.com/sim900-sim800-not-working-possible-reasons/)

* [Getting Started with the ESPlorer IDE](https://www.engineersgarage.com/getting-started-with-the-esplorer-ide/)

* [How to provide enough power for SIM800L/SIM800L V2 GSM module?](https://forum.arduino.cc/t/how-to-provide-enough-power-for-sim800l-sim800l-v2-gsm-module/621591)

* [SIM800l和SIM800c的区别](https://www.arduino.cn/thread-96270-1-1.html)

* 油管[IoT 4E频道](https://www.youtube.com/channel/UCRr7hK2KmaxtkqN7XegABDQ)有不错的关于esp8266的教程

* [20元+20行代码，体验物联网设备开发—温湿度监测站](https://zhuanlan.zhihu.com/p/40896074)

* [PROTOCOLS: UART - I2C - SPI - Serial communications #001 - YouTube](https://www.youtube.com/watch?v=IyGwvGzrqp8&ab_channel=Electronoobs)

* [SIM800C的使用心得](https://blog.csdn.net/Tech_JOY/article/details/105877066)

* [18650 battery test with capacity curves for many cells](https://www.candlepowerforums.com/threads/18650-battery-test-with-capacity-curves-for-many-cells.308451/)

* [SIM800C GSM/GPRS HAT - Waveshare Wiki](https://www.waveshare.com/wiki/SIM800C_GSM/GPRS_HAT)
* [SIM800C GSM GPRS模块 接CH340G/USB转串口线(USBTTL)电脑AT指令调试实现windows10 电脑发送短信](https://www.cnblogs.com/meetrice/p/14158449.html) 
  
* [SIM800L 模块 使用AT命令打电话](https://blog.csdn.net/tcjy1000/article/details/112548136)
