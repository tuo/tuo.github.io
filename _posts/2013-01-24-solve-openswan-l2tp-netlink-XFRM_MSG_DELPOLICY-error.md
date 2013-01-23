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
		[What's xl2tpd's 'ERROR: netlink XFRM_MSG_DELPOLICY ...' about?](http://readlist.com/lists/openswan.org/users/2/12949.html)

The answer is really brief and I have no idea what he is saying. 

>	Specify a specified listen-addr IP, do not use 0.0.0.0. It causes
>	problems with putting the proper src ip on UDP reply packets.


Then I guess he is saying some attribute in /etc/ipsec.conf and after played some time, I figure it out.

Here is solution:

open  /etc/ipsec.conf and add or replace with following lines:

		leftnexthop=X.X.X.X
		dpddelay=40
		dpdtimeout=130
		dpdaction=clear

**Remember the leftnexthop value should be the same with value of 'left'**

For me, here is my previous config file:

	version 2.0
	config setup
	    nat_traversal=yes
	    virtual_private=%v4:10.0.0.0/8,%v4:192.168.0.0/16,%v4:172.16.0.0/12
	    oe=off
	    protostack=netkey

	conn L2TP-PSK-NAT
	    rightsubnet=vhost:%priv
	    also=L2TP-PSK-noNAT

	conn L2TP-PSK-noNAT
	    authby=secret
	    pfs=no
	    auto=add
	    keyingtries=3
	    rekey=no
	    ikelifetime=8h
	    keylife=1h
	    type=transport
	    left=209.141.44.110
	    leftprotoport=17/1701
	    right=%any
	    rightprotoport=17/%any
		

Then I add following lines to that file:
		
		leftnexthop=209.141.44.110
		dpddelay=40
		dpdtimeout=130
		dpdaction=clear

And it works! YEAH!
