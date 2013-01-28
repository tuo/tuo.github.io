--- 
layout: post
title: "Solve OpenSwan(Ipsec) L2tp netlink XFRM_MSG_DELPOLICY error"
category: "vpn"
published: true
---
#Setup VPN
Recently I bought a vps to setup VPN. The OS is Debian 6.
Well I'm using OpenSwan(IPsec) + L2tp and follow the instructions from this website:[How To Set Up A L2TP/IPSec VPN In A VPS](http://freenuts.com/how-to-set-up-a-l2tpipsec-vpn-in-a-vps/#iJeUrbJARCIcU8jk.99).

Everthing works fine. 

>  ipsec verify 

Prints shows that everything works good. 

But I often get this error in /var/log/auth.log and I can't connect to VPN server:

	ERROR: netlink XFRM_MSG_DELPOLICY response for flow eroute_connection delete included errno 2: No such file or directory	
	
I do search on google and openswan forum. But there isn't any clear/direct answer to this quesiton.

#XFRM_MSG_DELPOLICY? WTF!!!
Until I saw the this post on OpenSwan forum : 
		[What's xl2tpd's 'ERROR: netlink XFRM_MSG_DELPOLICY ...' about?](https://lists.openswan.org/pipermail/users/2011-April/020411.html)

The answer is really brief.

	> 2) I have all along been experiencing the behavior in OpenSwan that I think is a documented bug:  When I disconnect my iPhone from the VPN, I need to restart it with /etc/init.d/ipsec restart before I'm able to reconnect.  Is there a known fix to this?  I actually have an idea on how I can set up a password-protected URL to remotely restart it, so in a pinch, I can get that working, but obviously a proper fix would be ideal.
	That's a known apple bug, and should be resolved if you use openswan 2.6.33 and xl2tpd 1.2.8

Here is solution: make sure you have correct version of OpenSwan and Xl2tpd.

	sudo ipsec --version	

Then you get following info:
	
	Linux Openswan U2.6.34/K3.0.0-12-generic (netkey)
	See `ipsec --copyright' for copyright information.

Check Xl2tpd version by running:
	
	sudo xl2tpd --version
	
Then you get:
	
	xl2tpd version:  xl2tpd-1.2.8

So make sure you get OpenSwan 2.6.33 installed. 

	cd /usr/src
	wget http://www.openswan.org/download/openswan-2.6.33.tar.gz
	tar zxvf openswan-2.6.33.tar.gz
	cd openswan-2.6.33
	make programs install

But failed. Because that version is not compatible with current kernel version.

Then I try version 2.6.34 and it got isntalled.

Then you config the /etc/ipsec.conf and ipsec.secrets.

Do remember to reboot to make ipsec work.

After reboot, try */etc/init.d/ipsec restart* and *ipsec verify*  and it should work.

Yep!