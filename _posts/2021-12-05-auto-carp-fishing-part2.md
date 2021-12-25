---
layout: post
title: "Auto Carp Fishing Part 2 - Make it Smart"
date: 2021-12-04 12:55:32 +0800
published: true
tags: fishing,carp,china,angling,carp fishing,rigs,hooks
---

Let's take a look at what's the common bite alarms with its smartness of "tell you when you've got a bite":

铃铛 + 海竿报警器+遥控器
<cite>Simplest one is </cite>

When a fish gets a bite and tugs at the fishing line, it would apply a force on the fishing line which makes the rod tip bend or vibrate. The simplest bite alarm is a fishing bell like twin bells, just clamp to the rod tip. The upside is that the fishing bells are cheap, lightweight, no battery needed; the downside is it is not that sensitive, also the sound is not that loud enough so you could only stay close to where that rod and bells are. Anyway it does what it need to do. Here in China, it is widely used. The advanced one is the bite alarm with alarm transmitter(base) and reciever(remote), with a adjustable volume, tone, and sensitivity. The alarm transmitter is like bell which placed on the rod pod or rod rest kinda bells, however the alarm reciever is a wireless companion device like mobile phones which could pick up the signal from the alarm transmitter and alerts you by vibrating, lighting up, or emitting a beep themselves with a range of some 50-150 meters(A decent bite alarm reciever like [JRC Radar CX Receiver](https://www.anglingdirect.co.uk/jrc-radar-cx-receiver-multi-led?queryID=dc78e1ec703826dcff83ad6abf562048&objectID=55637&indexName=live_ad_uk_products) £53.99, its range could be 150 meters) . The range would depend on conditions, for exmaple, how many obstacles in the way. It gives you some freedom so that you could others thing away from the rods like making a coffee and tidying up your barrow.

https://www.anglingdirect.co.uk/fishing-tackle/bite-alarms

If you're not worried about your rods/reels got stolen and your home is like in 150 meters range to where you're fishing, then after you could cast out rods and set up the bite alarm, you could just go back home and enjoy yourself.

That's kinda the idea of what I want to do but it is not smart and stealthy enough.  Here are my two cents:

 * Smartness.

The bite alarm basically works like a walkie talkie([Two-way Radio](https://en.wikipedia.org/wiki/Two-way_radio)). The transmitter - the alarm on the rod pod - sends a radio transmissiona which can be picked up by a reciever best through its antenna. The useful direct range of a two-way radio system depends on lots of radio propagation conditions, basically kinda limited. But I don't want to have it limited by some distance like 150 meters, I just want it to be as freely used as how we use our smartphones. Also that style of vibration or beep sound is just boring and archaic, how about some custom Ringtone from phone in my pocket, e.g, knock on wood, something that every angler would wish they could say to the carps:
  
> Hey, I just met you, and this is crazy. But here's my number, so call me maybe. 

 Yeah, [<Call Me Maybe>](https://www.youtube.com/watch?v=fWNaR-rxAic&ab_channel=CarlyRaeJepsenVEVO) from Carly Rae Jepsen.  vibe :) Just be smart enough to give me a call when it detects the bites.

 * Stealthiness.

Leave your eye-catching rods and reels, usually the most expensive fishing tackles, on the bank is basically just inviting people to steal. It is best to remove those rods and reels when the cast is done by linking the end of the fishing line to the tent peg staking out on the ground. But this comes with a big challenge when fighting the fish, I will talk later. Also the Smart Alarm's components need to be well layouted and fit compactly in a case that its size could be as small as possible, so that the whole device could be camouflaged like Rambo to not get distinguished by the passersby, let alone ones from some distance.

## Bite Alarm Approaches

There are basically two ways when coming to how we seutp the bite alarm, tent stakes with the fishing main line: 

![sketch_bank](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/sketch_bank.jpg)
<cite>onshore</cite>

![sketch_float](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/sketch_float.jpg)
<cite>offshore</cite>

We could put the bite alarm device on the bank or wrap it in a ball-shape buoyant floater. They share the same idea the sensor part of device could detech some gryposcope or acceraltor changes: either like in first case you put the senor on the inclined spring and once fish tug the line, the spring will be lifted up and senor could get that angle changes; or in the second case, the senor inside the float ball would detech a vertical acceleration（z-axis) when the fishing line is tugged from the bottom.

To make it more vividly, I did a little expierment to simulate a fish bite like follwing gif:

![](http://d2h13boa5ecwll.cloudfront.net/20211002fishingpart2%2Ffish_trigger.gif)

Both has pros and cons. The offshore approach's pros:

* a good stealthniess. People could not reach it easily over the water.
* precison is higher given the shorter distance from float to the fish
* not limited by onshore/bank conditions
* serve as a bite indictor. No matter fishing coming towards the bank or running away from the bank, it always got trigged.

its cons:

* pretty difficult to get it waterproof yet easy to open/close to setup device.
* subject to weather conditions. if too windy or too much current, float ball - the big size and heavy weight - could be pushed back and forth, therefore cause the rigs and lead to move away. Also if sunlight is strong enough it might got overheat inside the enclosed ball and cause eletronics malfunction.
* the casting process gonna be more complicted
* gonna pretty much loose the device, fishing lines and rigs when it got snagged on the bottom 

![offshore spike](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/real_ball.jpg)
<cite>I have tried a couple of pe or pvc products with sphere shape like Gashapon and AB glues but the water resistance stil remains a big headache. No existing product that suits my need could be found on taobao. </cite>


The onshore approach's pros:

* no concerns over the waterproofing, heating etc
* no change in casting process, just normal casting
* not limited by windy or other harsh weather conditions
* just gonna loose the fishing lines and rigs when the hook got snagged or stucked in the rocks/weeds of the bottom. Bite alarm is intact.

its cons:
* high demand on stealthniess. Still people could possibly see it and just take it.
* precision of bite signal is not that good given the long distance of fishing line.
* the disguise requires a kinda blending with sourroundings.

![onshore approach](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/angle_change.jpg)

After weighing trade-offs between onshore and offshore approaches, onshore one seems to be a good start point as it is simpler and materially lower demanded. Next, let's dive into the detailed mechanism.

## Mechanism 

![](http://d2h13boa5ecwll.cloudfront.net/20211002fishingpart2/jiegou.jpg)

* sensor input: data collecting, detect physical change of angle and acceleration and convert to digital/analog signal. 
* mcu coodirnator: either poll the input senor or via interrupts to get data and check see if it meets the criteria. If yes, send commands to an actuator output to perform some physical actions.
* actuator output: establish connection with ceullar base station nearby, register network. then take commands from MCU, send data over cellular data and initial a call to certain mobile number.

Other than just sending phone-calling command when got trigger, The MCU controller normally does some heartbeat check every few seconds or minutes by sending a very few bits of data to some cloudplatform or backend server to log its health status. 

Above is a typical scernario of the buzzword: [Internet of Things (IoT)](https://en.wikipedia.org/wiki/Internet_of_things). One of unique thing here, which is a good thing,  is the communication between mcu and cloud platform is a single direction, i.e, only from MCU to cloudplatform, therefore no need to take any commands from cloudplatform to perform some actions to be autonomous.

A rule of thumb for IoT development is to always have its datasheet something like technical reference/documentation at hand. "More haste, less speed", it is gonna save your lots of trouble and time. Datasheet is always something you could fall back on when you just have no idea or get into some clueless difficulties.

## MCU - ESP8266

Consider central processor/unit as the brain which is consisted by a hardware and software. Based on this central unit there are microcontroller-based IoT boards like Arduino/ESP8266/STM32F and microprocessor-based boards like Raspberry Pi. But how much processing power it needs for our case? Not much. Surely Rasperry PI is a overkill. Between the Arduino Uno and NodeMCU ESP8266, the esp8266 is the no-brainer. Arduino Uno board, which was used to be dominant player in previsouly years, despite having a very mature and vibrant community, doesn't have Wi-Fi capability built-in, has a voltage of operation of 5V, a pyschizie size 69 mmx53 mm. Nowadays, [NodeMCU ESP8266](https://www.espressif.com/en/products/socs/esp8266) board, which comes from a Chinese company [Espressif](https://www.espressif.com/en/company/about-espressif), is the most popular one which comes with Wi-Fi built-in (extremely convient to get started and play with sth), a voltage of operation of 3.3V(less power and current consumption means power source could have more options hence cost is lower), a smaller size 58mmx31mm (easier to fit onto breadboard and have a smaller overall case size to be more stealthy). Look at its price on Taobao:

价格图片 

<cite>NodeMCU ESP8266 vs Arudio Uno R3 </cite>
 
Apart from that, ESP8266 could be programmed with C/C++ in Arduino IDE just like Arduino Uno. Even though generally bare-metal boards and chips don't have a operation system, ESP8266 is one heck of IoT microcontroller - it does provide capability to install some firmwares on the top of the [Espressif Non-OS SDK for ESP8266](https://www.espressif.com/en/tags/non-os-sdk) to abstract and simplify the development process.

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/nodemculua.png)
<cite>Left picture source: [#240 Time to Say Goodbye to Arduino and Go On to Micropython/ Adafruit Circuitpython?
](https://www.youtube.com/watch?v=m1miwCJtxeM&ab_channel=AndreasSpiess) from Andreas Spiess. <br/>&nbsp; On the the right side you could see it took me 4.6 seconds to get led blinking code compile&upload</cite>

Everytime you debug in Arduino IDE is kinda painful, you write in C/C++ code, compile, build and upload to board and this process could take some time even if you tuned some paramter like *Tools -> Upload Speed* to the max. But with those flashed firmware installed on the board first, you could just write the code in the language you'd like and save it then it got instantly executed on the board. Some language(tailored, not full set of feature) and its firmware for ESP8266 are: Lua based [NodeMCU](https://nodemcu.readthedocs.io/en/release/), Python based [MicroPython](https://micropython.org/), JavaScript based [Mongoose OS](https://mongoose-os.com/). That should be the agile way of iot development :)

After install the CH340 driver for mac, go to [NodeMCU custom builds](https://nodemcu-build.com) select modules(I have chosen those modules - bit, file, gpio, i2c, net, node, softuart, tmr, uart) to include for building the firmware. Then open *NodeMCU PyFlasher* to flash the downloaded bin file of firmware to the board.

Run the jar file of *ESPlorer IDE* to open the programming gui. The only problem with this on Mac is the serial port of the device sometimes doesn't show up in the top right dropdown list, even though it is recogized by the system(*"ls /dev/tty.\*"*). I have to go to settings and manually set the serial port of the device.

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/ESPlorerIDE_advanced.jpeg)

The entrance file of NodeMCU is the `init.lua` where we're gonna import files from senor and actuator and code some trigger logic here.

TODO: pin脚图

## Sensor - MPU-6050

价格图片

The senor module for detecting the angle and acceleration is the GY-521 [MPU-6050](https://invensense.tdk.com/products/motion-tracking/6-axis/mpu-6050/) which is six-axis (Gyro + Accelerometer) + embedded temperature sensor motion tracking device.

We're just gonna use 4 pins from MPU6050: sda, scl, gnd, vcc. Here is how I wire it with MCU Esp8266 and its schematics:

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/mpu_2_mcu.png)
<cite>A good tip is have your wire color coding schemes, for exmaple a brighter color red/orange for vcc positive, a darker color black/blue for ground or earth.<br/> &nbsp; more on: [#12 Five Tricks for working with Dupont wires](https://www.youtube.com/watch?v=eI3fxTH6f6I&ab_channel=AndreasSpiess)</cite>

You might wonder what does the sda and scl mean? Here is a very important topic - [serial communication](https://en.wikipedia.org/wiki/Serial_communication). In order to be as verstile as possible to commuicate with all kinds of peripherals like sensors and actuators, it has a varaitey of forms of communication - it could be analog (voltage or current) or digital (using a protocol like I2C or SPI or UART). Each protocol has its own requirements , limits and use cases. What MPU-6050 communicates is a [I2C(Inter-Integrated-Circuit)](https://en.wikipedia.org/wiki/I%C2%B2C) 2-Wire protocol. The two wires are serial data (SDA) and serial clock (SCL). The I2C device has some register addresses for system bus to look up. That's something got mentioned on its datasheet.

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/register_slave_addr.png)
<cite>来自MPU6050的技术手册在4.32章节，MPU6050有很多地方需要查看技术手册</cite>

Here is the code snippet for getting gyropscope in degrees/secdons unit, acceleration in g unit and  termperature in degree/celcius. The main flow is setup resolutions like unit you like to measure in, then inside a loop, retrieves its data and convert with proper scale factor or formula based on the configurations.

<script src="https://gist.github.com/tuo/f86c40beca754c779e3b62a7aca39eed.js"></script>

The mpu-6050 features a user-programmable gyro full-scale range of ±250, ±500, ±1000, and ±2000 °/sec (dps), and a user-programmable accelerometer full-scale range of ±2g, ±4g, ±8g, and ±16g, which could be found in its datasheet. You could get more advanced one like Yaw/Pitch/Roll from arduino forum or someone use it to control a drone. But the above one suffice in my case.

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/esplore_output.png)

## Actuator - SIM800C

In terms of the connectivity, we need take a look at the environment that we will be putting the device in. There is no way it could have WIFI on the bank of the lake. Ideally we want it could make a phone call and send network request just like our mobile phones. A module that has the [GSM](https://en.wikipedia.org/wiki/GSM) for voice calling and sms, and the [GPRS](https://en.wikipedia.org/wiki/General_Packet_Radio_Service) for celullar data transfer, would be a good fit. 

The frequence of network request is quite low - heartbeat rate could be like very 1 minute. No privacy or security concerns here. A HTTP get/post request would work. And the data it needs to send is very small. No video streaming, no need for low latency, so the 3G,4G,5G is kinda overqualified, the best one here is the vintage 2G cellular network.

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/tb_sim800_all.png)

<cite>2G is kinda dying out in China. If you'd like you could have NB-IOT as an alternative. SIM7020C is a perfect subsistute for SIM800C, with same dimension and same layout.</cite>

[SIM800C](https://www.simcom.com/product/SIM800C.html) is a quad-band GSM/GPRS module in a LCC type which supports GPRS up to 85.6kbps data transfer. SIM800C has one SIM card interface. It integrates TCP/IP protocol.SIM800 can be controlled/configured using simple AT commands. MCU can send AT commands over the [UART interface](https://nodemcu.readthedocs.io/en/release/modules/uart/) and control the SIM800. It can be used for sending/receiving messages, making calls, sending/receiving data over the internet, etc. 

You could debug this module with AT commands(Here is the [SIM800 Series_AT Command Manual_V1.12](https://www.elecrow.com/wiki/images/2/20/SIM800_Series_AT_Command_Manual_V1.09.pdf)) via a USB-TTL converter to connect to your laptop. After connected, using a wire to shorten the PWX pin on the GND on the sim800c board so that the module could start.

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/sim800_usbttl.jpeg)

<cite>Pay attenton the direction and the side of sim card when inserting into the slot</cite>

Then we could try AT commands in [CoolTermMac](https://learn.sparkfun.com/tutorials/terminal-basics/coolterm-windows-mac-linux) on Mac, just choose serial port in *Serial Port Options*, choose Line Mode in *Terminal Mode* and switch from *View Hex* to *View ASCII*.

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/sim800_coolterm.jpeg)

<cite>A couple of useful at commands to try out: *AT+CPIN?* check if sim card is ready; *AT+COPS?* to check which operator it is registered; *AT+CREG?* to request network registration status; *AT+CSQ* to show network signal quality; *ATDXxxxxx;* to call some phone number</cite>

The most important debugging tool for SIM800c is the network LED on the top right side of the SIM800C indicating the status of the cellular network. It has different blinking rate. When powed up, the led will blink every 1 seconds to indicate that it is actively searching for cellular base station therefore not connected to cellular network yet. When it has made contact with the cellular network & can send/receive voice and SMS, all is good, it will blank every 3 seconds. 

![](https://lastminuteengineers.b-cdn.net/wp-content/uploads/arduino/Netlight-LED-Blinking-Finding-Network-Connection.gif)

![](https://lastminuteengineers.b-cdn.net/wp-content/uploads/arduino/Netlight-LED-Blinking-Network-Connection-Established.gif)

<cite>SIM800L is pretty much same to SIM800C.https://lastminuteengineers.com/sim800l-gsm-module-arduino-tutorial/</cite>

Connections and code snippet should be like below:

    TX (SIM800C)-RX (D3)
    RX (SIM800C)-TX (D2)
    GND (SIM800C) - GND (MCU)
    VBAT (SIM800C) - VCC (MCU)
        

<script src="https://gist.github.com/tuo/67b6826971d63fd5fba7f81795083c2d.js"></script>

Here we send a http GET with *txt* parameter to some url. The txt is the string literal of content from MPU-6050 sensor.From the Nginx log of backend server, we could see following log:

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/server_log_check.png)

As you see, when I put the MPU-6050 on the inclined spring and lift the spring up, from the log, I could see a sudden jump for *ax*, which I could tell whether something happened or not.

### SIM800C Instability

There are lots of people in the forum or on the youtube complaining about the stability issue of SIM800. They ususally get some wierld problems like the module keeps shutting down or the network led light blinks in a chaotic way and it won't just function in a stable way. And I also had this problem too, as you see, from above,how I wire and connect the module with MCU.

Power and current requirements and its consumption is often the most important part of IoT development. The NodeMCU - according its [datasheet](https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf), page 7, its operating voltage requirement is from 2.5v to 3.6v and inbuilt LDO voltage regulator of 3.3v - and the sensor, is powered by the one single battery of 18650 3.7v. The power source is another interesting and important topic also for IoT development and lots of factors need put into consideration. 18650 is based Lithium-Ion and the most commonly used one and it is rechargable. You could use expensive one like Lipo based battery. Basically you need provide a voltage that is neither too high that over the module's upper limit nor too low like battery is keep discharging and its voltage falls under that desirable voltage of the module making the module keeps shutting down. 
For example, You could use 2 cells of 1.5v Alkaline non-rechargeable battery(1.5v * 2 = 3v), but it is like in the low side of the specfication(2.5v-3.6v) and it would waste 50% of the energy of the battery; Or you could use 3 cells of AAA battery (1.5v * 3 = 4.5v), but 4.5v is way over the up limit of the specs (3.6v), therefore you need some LDO regulator to drop the voltage. So for non-rechargable battery, you kinda end up with some engery wasting or introducing some complexity. More on the battery supply options for ESP8266, there is a pretty good video from Andreas Spiess on [<#64 What is the Ideal Battery Technology to Power 3.3V Devices like the ESP8266?>](https://www.youtube.com/watch?v=heD1zw3bMhw&t=105s&ab_channel=AndreasSpiess).

So it is always good to check its specs and datasheet.








SIM800C could be debugged separately with a USB-TTL


Connectivity is the key factor which makes the whole thing alive.

There are a few good options on which network you can use, and you can mix more than one in your architecture (you will probably need to do it): protocols like ZigBee, Bluetooth, LoRaWan, WiFi, Ethernet, LTE, 5G, etc.\

WiFi: suitable for indoor facilities like home and office IoT devices
GSM/GPRS: for outdoors standalone devices

IRMPVOEMNT: NB-IoT 
NB-IoT: Narrow Band IoT is a cellular communication technology specially designed to power IoT communication, very low power




So we only have one IO pin

Microcontrollers based
Arduino Uno, Mega: easy to develop and lots of pins to connect peripherals, great for prototyping
ESP8266 / ESP32 boards: has WiFi and Bluetooth connectivity, low cost (ESP8266 costs around $3), plenty of resources to develop
STM32F series boards: complex to develop, production-friendly and easily manufactured, most widely used in production
Microprocessor-based :
Raspberry Pi: great community, easy to develop, can run OS like Linux, windows
Beagle bone: open source board, can put android, ubuntu and other Linux, has built-in flash storage

These pins are IO pins which are used to connect to any sensors or actuators you want to use

So just pick a board that suits your requirements and using these IO pins you can use any sensors as you like. Any sensor you pick would most probably be compatible with all the boards.


muc product software:
Since the code needs to be compiled specifically for the microcontroller or microprocessor and due to lack of OS like Linux, Windows which abstracts the hardware variations, the software and tools that will be used to develop greatly depends on the chip you select. Though there are multiple frameworks that try to support a lot of chips. like Arduino Framework: 

Arduino Framework: supports a variety of boards and chips like all the Arduino, ESP8266, ESP32, STM32 chips




I never heard that thing before when learning with ardunio a couple of years ago. I never did something with some practical usage with ardunio after lighting up some leds, just like what I did with Rasperry PI.

seperat eof conversn; like modulration ; connect/link those two modular is shoudl easy to setup.

Calculating the Volume of a box


 
铃铛+ alarm head and alarm reciver.

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

There are a few good options on which network you can use, and you can mix more than one in your architecture (you will probably need to do it): protocols like ZigBee, Bluetooth, LoRaWan, WiFi, Ethernet, LTE, 5G, etc.\

WiFi: suitable for indoor facilities like home and office IoT devices
GSM/GPRS: for outdoors standalone devices

IRMPVOEMNT: NB-IoT 
NB-IoT: Narrow Band IoT is a cellular communication technology specially designed to power IoT communication, very low power

Communication Protocols t: http : most easy to pick up, has lots of overhead, not synchronous, ideal for single requests, not continuous communication


Design
Now that you have chosen your sensors, your processor, and created an application, you need to put all that into a case. It will not cause a good impression to send your product with some wires or batteries appearing. It might even cause some damages to the user.
A nice and well-designed case can be difference from another similar product. For some applications, like home automation, a round, colorful, light case can be OK. For others, like mining industries, you will need a little more robust and resistance.

Assembly: since you have a lot of parts that you need to put together, you have to think about how to assembly all inside your case. It doesn’t matter if it is you or your customer that will assembly, an easy process can save a lot of time.


Cloud Platform

 It also should maintain the status, health of all the field devices.

HTTP - bettern than https

just nginx and log with juicy ssh , being able to look via my arndoi phone. If Ineed to check its status, 

extend: wechat or sth




Datasheet: a short document that informs the user what are the operation conditions, the limits, dimensions, and features of your product.

---

Interaction (indicators and buttons)
Another part of an IoT product is the interaction with the user. It is important for the user to know what is the status of your product. If it is functioning, if it has an error, or if it needs any action to continuing.

------ put in a case, not just with wires scattering there an there. and to stay sthealy to minize size of box.

bread board; customize it - find proper pvc/pe box and cut it to fit it. 


问题和解决： 一开始每个15秒钟发送一次，过了五分钟之后，每隔3分钟发送一次



TODO: 保证鱼不容脱钩发力

* 泄力 - 比如弹簧 或者橡皮筋 rubber band or fabric latex
* 铅坠 - 活动 - 这样鱼不会那么会摆动
* 缓冲 - 加多10米的线在岸上 冬天鱼的活力没那么好 metabolism
* open water, less snags or structure (rock formations/too much weedy)




提高： 用中断， 但是没有heartbeat
用poll简单，有hearbeat, 但是费电


鱼线要slack一点点，不用太紧. 留一点余地， 然后用石头压住Water: In rivers or canals with boat traffic or debris, you can get a lot of false alarms just from the flow of the water. That’s when you want to turn the sensitivity down.

Wind: While you can control your own setup, the wind will probably dictate the sensitivity setting more than anything else. Remember that the direction and speed can change at any time, so you may have to adjust the setting during throughout the session.

sewing thread 
With the kind of thread sewing clothes
Thread or a thread is a long very thin piece of a material such as cotton, nylon, or silk, especially one that is used in sewing.



### REFERENCE

https://medium.com/geekculture/a-complete-guide-on-how-to-create-an-iot-product-62241640c49b
https://towardsdatascience.com/a-comprehensive-guide-to-start-building-an-iot-product-ba32dfb91c7a
https://blog.particle.io/building-an-iot-device/


/var/folders/zj/rd6p8_fx1rd6k171c2qn703w0000gn/T/TemporaryItems/(A Document Being Saved By screencaptureui 42)/Screenshot 2021-12-23 at 12.17.57.png

TODO: 高亮 esim 不需要实体卡， 电压电流要求更低， 但是无法打电话 

Highlight its good

A short yet good coverage on the cases of NB-IoT [NB-IoT Commercial Premier Use Case Library](https://www.gsma.com/iot/wp-content/uploads/2017/12/NB-IoT-Commercial-Premier-Use-case-Library-1.0_Layout_171110.pdf) by HuaWei

https://www.harrissportsmail.com/uk/blog/set-up-bite-alarm

https://improvedcarpangling.com/what-is-a-carp-fishing-bite-alarm/


https://www.youtube.com/watch?v=zSG_YubWIE8&ab_channel=TheCargoCultCaf%C3%A9

https://www.youtube.com/watch?v=PWn5pm_HWTM&ab_channel=CaptainQuinn


[MPU6050 datasheet](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Register-Map1.pdf)
[ESP8266 Technical Reference](https://www.espressif.com/sites/default/files/documentation/esp8266-technical_reference_en.pdf)
* [SIM800C Datasheet技术手册](https://www.elecrow.com/download/SIM800C_Hardware_Design_V1.02.pdf)

NODEMCU ESP8266 VS ARDUINO UNO https://www.electroniclinic.com/nodemcu-esp8266-vs-arduino-uno/


[#12 Five Tricks for working with Dupont wires](https://www.youtube.com/watch?v=eI3fxTH6f6I&ab_channel=AndreasSpiess)

https://medium.com/geekculture/microcontroller-connection-protocols-w1-i2c-spi-uart-7625ad013e60

The Engineering Mindset
How ELECTRICITY works - working principle
https://www.youtube.com/watch?v=mc979OhitAg&ab_channel=TheEngineeringMindset



[《MPU-6050 6dof IMU tutorial for auto-leveling quadcopters with Arduino - Part 1》](https://www.youtube.com/watch?v=4BoIE8YQwM8&t=636s&ab_channel=JoopBrokking) 和[《MPU-6050 6dof IMU tutorial for auto-leveling quadcopters with Arduino - Part 2》](https://www.youtube.com/watch?v=j-kE0AMEWy4&ab_channel=JoopBrokking)

https://www.waveshare.com/wiki/SIM800C_GSM/GPRS_HAT


[<#64 What is the Ideal Battery Technology to Power 3.3V Devices like the ESP8266?>](https://www.youtube.com/watch?v=heD1zw3bMhw&t=105s&ab_channel=AndreasSpiess)