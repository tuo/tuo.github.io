layout: post
title: "Auto Carp Fishing Part 2 - Make it Non-attended"
date: 2021-12-04 12:55:32 +0800
published: false
tags: fishing,carp,china,angling,carp fishing,rigs,hooks


Sensors
If you want to measure something, you will need a sensor. The sensor is responsible for converting the physical variable you want to measure into an electrical signal that will be read by the computer.


问题和解决： 一开始不用橡皮筋，出发时间很短， 无法保证1秒钟， 需要延迟 最好是用橡皮经



Processor
All the sensors, actuators, and indicators will need to be controlled. And here enters the processing unit. We have a wide range of options, from a simple Arduino microcontroller to an advanced AI mini-PC.

* howmany I/Os:
* processin gpower

MCU:

desktop，laptop, rasppery pi, adrudio , esp8266

no need for high-end microprocessor 


commmunication between device and server is single directional, so thatis much esaier, just send out message from device. No control side.
Trasnmit of data is small, latency is fine, not video no audio, just smallb ytes of http data. and some call.





uusing mpu6050 but it turns out to be overkill


SIM:

Actuators
If you want that your product performs an action, like open a door, you will need an actuator. In simple terms, a “mover”.
For example, if you are designing a home garden product, you might want to use a solenoid to water the plant automatically when the soil humidity gets below a certain level.


Input Power: how much power your actuator demands to work. This might be a problem when all you have is a battery to power your whole system. Or you will need a dedicated circuit to drive your motor, for example.
Installation: depending on your actuator, you might need to develop a system to avoid vibration, for example.







SIM KA

Impovement: using esim card(couldn't call) and nb-iot is better - sim7020c




Power is key to consider: what is the input voltage or the current it drains to operate. This can be crucial if your product needs to use batteries, for example.
Resolution
Operation : it is the range your sensor can work, both environment and variable itself. For example, if you want to measure the current of a motor that will work on Antarctica, it will need to support working in temperatures below 0ºC. And if your current will never be above 30A, it does not make sense to use a sensor that will read only up to 20A.

Power
We’ve talked a lot about power. It is a crucial factor to your product, and depending on where you are going to use it, it can be a limitation to what other devices you are going to choose.

If you need to include batteries (because it will be moving around or on the field), the amount of time it will need to run exclusively on it is a crucial factor. Imagine having to change the batteries on a weather buoy device that is in the middle of the ocean every day.

电池 18360 为什么不用纽扣电池

 This can lead to damages to your devices or a momentary malfunctioning that can cause real problems. There are systems to mitigate this kind of problem, like UPS, voltage regulator, power banks, etc.
 
> Note: be careful with some operations of your device, specially those involving wireless transmission, that consumes a lot of power. This increase the load and, depending on the source you are using, can cause a momentary voltage drop that might cause your device to reset or not work properly.

Connectivity

There are a few good options on which network you can use, and you can mix more than one in your architecture (you will probably need to do it): protocols like ZigBee, Bluetooth, LoRaWan, WiFi, Ethernet, LTE, 5G, etc.


Design
Now that you have chosen your sensors, your processor, and created an application, you need to put all that into a case. It will not cause a good impression to send your product with some wires or batteries appearing. It might even cause some damages to the user.
A nice and well-designed case can be difference from another similar product. For some applications, like home automation, a round, colorful, light case can be OK. For others, like mining industries, you will need a little more robust and resistance.

Assembly: since you have a lot of parts that you need to put together, you have to think about how to assembly all inside your case. It doesn’t matter if it is you or your customer that will assembly, an easy process can save a lot of time.


Cloud Platform

HTTP - bettern than https


Datasheet: a short document that informs the user what are the operation conditions, the limits, dimensions, and features of your product.

---

Interaction (indicators and buttons)
Another part of an IoT product is the interaction with the user. It is important for the user to know what is the status of your product. If it is functioning, if it has an error, or if it needs any action to continuing.



问题和解决： 一开始每个15秒钟发送一次，过了五分钟之后，每隔3分钟发送一次



TODO: 保证鱼不容脱钩发力

* 泄力 - 比如弹簧 或者橡皮筋 rubber band or fabric latex
* 铅坠 - 活动 - 这样鱼不会那么会摆动
* 缓冲 - 加多10米的线在岸上 冬天鱼的活力没那么好 metabolism
* open water, less snags or structure (rock formations/too much weedy)




提高： 用中断， 但是没有heartbeat
用poll简单，有hearbeat, 但是费电




### REFERENCE

https://medium.com/geekculture/a-complete-guide-on-how-to-create-an-iot-product-62241640c49b
https://towardsdatascience.com/a-comprehensive-guide-to-start-building-an-iot-product-ba32dfb91c7a
https://blog.particle.io/building-an-iot-device/


