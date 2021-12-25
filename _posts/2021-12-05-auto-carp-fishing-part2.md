---
layout: post
title: "Auto Carp Fishing Part 2 - Make it Smart"
date: 2021-12-04 12:55:32 +0800
published: false
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

<!-- 
<script src="https://gist.github.com/tuo/f86c40beca754c779e3b62a7aca39eed.js"></script> -->

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

图片

<cite> Page 17 in chapter *4.1 Power Supply* of sim800c [datasheet](https://www.elecrow.com/download/SIM800C_Hardware_Design_V1.02.pdf)</cite>

In most of time, the current consumption is not that much. But during the transmission burst, the current draw could reach to 2A. If the power supply couldn't source 2A of surge current, its voltage will drop out and if it falls under 3V, the module will be shut down automically.

In the datasheet, it suggests two approaches to work around this.(See, the datasheet not only just lists the specs but also provides solutions :))

* ##### 5v LDO (low dropout regulator)

Use 5v power source like power bank etc, then use 2A-rated DC-DC [Buck Converter](https://en.wikipedia.org/wiki/Buck_converter) like [LM2596](https://www.onsemi.com/pdf/datasheet/lm2596-d.pdf)(a 3.0A Step-down switching regulator, 2.33RMB ~ 0.3$), connect it to VBAT pin on Sim800C.

* ##### 3.7v Li-ion Battery (Recommended)

Li-ion battery like 18650 3.7v is perfect for the SIM800 module. 2000mAh(could be even smaller), the most commonly seen one, is good enough to provide the correct voltage range even during 2 Amp surge.

I have been using 3.7v Li-ion Battery solution for over two-three months with sim800c and it just works perfectly.

That means we have two 18650 batteries: one for the Esp8266 and MPU-6050, one for the sim800c. Here is the final schematics:

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/wire_sketch.png)


## Case Design

Here is the final wires of the device:

![](http://d2h13boa5ecwll.cloudfront.net/20211003fishingpart3/real_wire.jpg)

As you could see, the wires are pretty messy. When I try to do a mini test, I found it was so hard to put all the wires/modules inside a case. Also there is a problem with putting the sensor(mpu-6050) on the spring coil of fishing set, and connect to the MCU inside the device case with non-flexible dupont lines. The mpu-6050 chip is not easy to bind onto the spring coil and get a steady and same position/angle everytime. What's even worse, 4 wire of dupont lines imposes a constraint on how we arrange the fishing set and bite alarm device.It is not like regular thread like sewing one which is soft and flexible and easy to twist and extend. Lastly, not only the device box(the case) need to be waterproof, but also the sensor MPU-6050 need to be waterproof. In software term, as what Uncle Bob Martin would say in one of his book [Agile Software Development, Principles, Patterns, and Practices](https://www.amazon.com/Software-Development-Principles-Patterns-Practices/dp/0135974445), those modules are not loosely coupled and highly cohesive - They expose too much its internal details that caller shouldn't just be bothered.

If we just revisit why we choose the MPU-6050 as the sensor at the very beginning，given we have chosen the onshore strategy, it looks like it could be replaced with an easier one. The fish tugs the fishing line, how could we use that force to trigger something? If you put "sensor" on the Taobao or Ebay, you could find lots of sensors with differnt purposes. A [YL-99 collision switch senor](https://www.ebay.com/itm/172922682069)(2.4RMB - $0.4):

图片 yl-99 - 拉动示意图

A collision switch could detect force on it and when force is strong enough to push it to be closed, it outputs a low voltage (0), otherwise a high voltage(1).

With this collsion switch as the sensor, we could pack the whole modules inside a standlone case then use a sewing thread to connect the device to the fishing line. Now the connecting way is easy and flexiable, hence we could put the fishing sets and device anywhere separately I'd like to based on the environment.

Next is how to deal with the messy rampant wires to make it neat and tidy so that it could fit inside a case as small as possible. First, I bought different standard sizes of breadboard and try how to fit diffent modules inside it. Second, I measured the approximate dimension(11cm*15cm*3cm) that it would take and bought differnt sizes of PVC plastic cases. And none of the case would perfectly fit, so I have to cut it with scissors and drill a hole with soldering iron in the side of the box to put the trigger line through.

Here is the finished case:
图片

The new schematics and breadboard wiring sketch:
图片

## Demo Test

Then we need some test to see whether or not it would work and how long the battery life could last. Here is the demo video I record to test:

视频 自己

<cite>Imagine the left side is the fishing line, you just tie the device to fishing line with sewing thread.(The yellow rubber is not needed)</cite>

There is a saying in software enginering that when you try to demo to other people, it usally breaks. So I brought it to the office and did a presentation to my colleuages:

视频 办公室
<cite></cite>

I made some adjustment in the init.lua. First when it starts, it send a txt saying *init* to backend, then send every 10 seconds for the first 5 minutes, so I could know whether it is properly set up and runnig ok. Then it sends heartbeat request with collision detection result every 30 seconds. The collsion poll is every 20 milliseconds, if once the collision is detected, it will call me in a interval of 0, 2, 4 minutes - three times.

I also installed the [JuiceSSH](https://juicessh.com/)(a free SSH client for Android) on my phone so that I could check its long anytime anywhere. And the log would also give me a clue if the call is not made somehow.

图片 juice ssh

But with 20 milliseconds poll interval(I assume the force is applied in a very short amout of time) and heartbeat every 30 seconds, the 2500 mAh battery for powering up the MCU get quickly dye out, however not for the Sim800C. The polling frequency is just too high. But if we slow down the frequence and do a quick tug, the collision sensor won't even detect it. How could we do with that?

There is a similar topic in algorithms: [Time-Space Trade-Off](https://www.geeksforgeeks.org/time-space-trade-off-in-algorithms/). To solve it, either in less time and by using more space, or in very little space by spending a long amount of time.

Yes, we'gonna use the extension spring, to use its elasticity to create some tension to absorb the strength or force to buy us some time for detecting intervals. Here I add one rubber band on the end of the sensor length line.With this, I could adjust the polling interval to 1 seconds (1 second is too high, this could 2 seconds even 5 seconds or 10 seconds in my mini experiment but this number should be set by the real scenario later but yeah this tweak does show it is possible to detect correctly in a long poll interval).

> 223.104.210.120 - - [11/Dec/2021:14:52:07 +0800] "GET /api/dashboard?time=3878805&idx=init%20colided:false HTTP/1.1" 301 169 "-" "SIMCOM_MODULE"

> 223.104.210.120 - - [12/Dec/2021:16:36:14 +0800] "GET /api/dashboard?time=305340902&idx=542,collided=false HTTP/1.1" 301 169 "-" "SIMCOM_MODULE"

Polling every 1 seconds form switch; sending every 3 minutes heartbeat - 2500mAh - it could last like 25-26 hours; for 3200 mAh it could last 36-38 hours. Not too bad!

## Real Test

With the all work done, it is good time to put it in real test. I happened to have two three days off and so I went back home. And in that reservoir, the water has dropped down so much, so the rice field side is just full of mud and I just picked the mountainside for fishing. 

I casted out, connected the fishing mainline to the staked tent pegs, then link mainline with device using a thread, and carefully disguised the device and tent pegs with rocks on the top of it. I looked at the ssh console, all good, so I just went back home around 3PM afternoon.

图片 - 布置

<cite>I'm pretty happy with the stealthness. You basically couldn't recognize it even if you pass it by. </cite>

The monring of the second day, around 7:50Am, I got three calls in my phones.I was pretty excited and rushed to the bank imaging how big the fish could be.By the time I got to the bank, I was just jaw-dropping to see three or four ducks sitting right on the spot where I set up my device and trigger. I was like "oh shit, no way" :)

图片 -  鸭子

I went to check my lines and bite alarm device. It turned out the fishing line and the trigger thread got twisted in a totally chaos.

图片 - 线被鸭子搅在一起

No wonder it got trigged! I did notice those ducks that afternoon when I set up.Then I changed with another pair of battery and moved the whole set to another venue that ducks couldn't reach easily.

That later two days it turned to be blank. I wasn't disappointed since I knew this was a brand vuene, had only one set of rod&reel&line&rig, and esp in winter, it was pretty tricky to get a bite.Instead, the process of trial-and-error has so much fun and I definitely will keep trying it out if later I have another holidays. Keep tunned!

## Improvements

There are some possible improvements we could do. Add extra 20 meters lines between the tent pegs and main line to give it extra buffer when fish is tugging the line. Also could add some rubber band to the tent peg to counter the force of the fish to simulate what rod does. The lead and sinker need to be slidable within some range if not droppable, to alleviate the panic of the fish after got a bite.

The polling style could be changed to using interrupts. Together with the sleep mode of Esp8266, you could make the battery lasts very long time. But the downside is you won't get the heartbeat http request.

Possible replace 2G with NB-IoT. No need real sim card, you could just use e-simcard. So you won't be too worried when your device is stolean by someone else therefore they got your sim card and inserted to their phone and do some bad things. The downside is it can't make voice call (could be resolved by calling Twilio api to make calls from them) and the module SIM7020C is more expensive.




Some improvements are 

* 泄力 - 比如弹簧 或者橡皮筋 rubber band or fabric latex
* 铅坠 - 活动 - 这样鱼不会那么会摆动
* 缓冲 - 加多10米的线在岸上 冬天鱼的活力没那么好 metabolism
* open water, less snags or structure (rock formations/too much weedy)





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