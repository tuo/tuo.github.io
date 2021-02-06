---
layout: post
title: "Mac环境下使用Homebrew安装Docker"
date: 2017-08-22 00:51:52 +0800
published: true
tags: #docker
---

如果我没记错，几年前还在使用[Puppet](https://puppet.com/)和[Chef](https://www.chef.io/chef/)来快速provisioning AWS上的机器， 虽然说比手动登一个一个SSH登上去手工操作是方便了些， 但是还得写各种[Recipe](https://docs.chef.io/recipes.html), 也是一件头疼的事情。 现在有了Docker, [DevOps](https://en.wikipedia.org/wiki/DevOps)甚至结合slack的[ChatOps](https://medium.com/slack-developer-blog/https-medium-com-slack-developer-blog-building-heroku-chatops-for-slack-f85ef2a3a94), 使得持续部署变得看起来是件容易的事情了。


## Docker
  Docker是一下在MAC下面安装Docker， 过去你可以使用Docker Tools加上笨拙的虚拟机Virtualbox, 但是还是比较麻烦的.
当然你可以去Docker.com去下载.dmg然后一键安装。问题在OSX上面，宿主机器和容器之间文件共享会变得非常慢。当然如果你只是小试身手，这个方式也没问题。 这里我们将着侧重在使用[Homebrew](https://brew.sh/) + [xhyve/hyperkit(native macOS hypervisor.framework)](https://github.com/zchee/docker-machine-driver-xhyve)来安装设置好docker.


## 安装
<hr/>

确保您安装好[Homebrew](https://brew.sh/),然后去terminal中打开

    brew update
    brew install docker docker-compose docker-machine xhyve docker-machine-driver-xhyve

这里需要解释下[xhyve](https://gist.github.com/0x414A/0d5303b787a449cd564f):

    Why xhyve ?

    So one of the painful points of using docker on OS X is that you need to run a virtualbox VM, which often suffers from performance issues. With xhyve, a OS X virtualization system, and docker-machine-xhyve you can now have docker use the native OS X hypervisor to run containers.

    No more dealing with virtualbox shenanigans!  


简单说轻量级的OSX虚拟化解决方案，让你摆脱恶心的VirtualBox设置和更新。

接下来在terminal中， 按照提示运行`root`权限命令：

    sudo chown root:wheel $(brew --prefix)/opt/docker-machine-driver-xhyve/bin/docker-machine-driver-xhyve
    sudo chmod u+s $(brew --prefix)/opt/docker-machine-driver-xhyve/bin/docker-machine-driver-xhyve  

就是这么简单。接下来就用`docker-machine`创建一个`machine`吧！

## 阿里云Docker源加速
<hr/>

[DockerHub](https://hub.docker.com/)确实厉害， 各种各样的镜像你都能找到，唯一问题是就是镜像， 你懂得，基本上都上百兆上G， 国内访问这速度真的感人。

幸好就像rubygem有淘宝镜像一样， 阿里云也提供Docker加速器。 进入[https://cr.console.aliyun.com](https://cr.console.aliyun.com)， 注册好账号，找到`Docker Hub镜像站点`， 在上面找到你专属加速器地址:

    https://xxx.mirror.aliyuncs.com

记下来。

![aliyun](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/misc/29531111-a777c1c6-86d9-11e7-8c20-8638b9f64664.png)

## 创建machine
<hr/>

回到termial, 输入:

    # Uninstall Docker Toolbox:
    sh -c "$(curl -fsSl https://raw.githubusercontent.com/docker/toolbox/master/osx/uninstall.sh)"
    #And remove existing caches
    sudo rm -rf ~/.docker

主要是清除之前Docker安装的信息。


接下里输入：

    docker-machine create default --driver xhyve --xhyve-experimental-nfs-share --engine-registry-mirror=https://xxx.mirror.aliyuncs.com

注意我们在后面添加了`--engine-registry-mirror=https://xxx.mirror.aliyuncs.com`赋予了阿里云提供的专属加速器。


## Hello World
<hr/>

创建machine顺利的话， 在terminal输入:

    docker pull hello-world
    docker run hello-world

如果看到以下输出就表示docker安装并设置成功:

    ⇒  docker run hello-world

    Hello from Docker!
    This message shows that your installation appears to be working correctly.

    To generate this message, Docker took the following steps:
    1. The Docker client contacted the Docker daemon.
    2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    3. The Docker daemon created a new container from that image which runs the
        executable that produces the output you are currently reading.
    4. The Docker daemon streamed that output to the Docker client, which sent it
        to your terminal.

    To try something more ambitious, you can run an Ubuntu container with:
    $ docker run -it ubuntu bash

    Share images, automate workflows, and more with a free Docker ID:
    https://cloud.docker.com/

    For more examples and ideas, visit:
    https://docs.docker.com/engine/userguide/  


## Docker images
<hr/>

你可以抓取一些常用的镜像，比如`docker pull node`:

![pulling](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/misc/29531112-a777c3a6-86d9-11e7-9c00-43cdb932984b.gif)

    ⇒  docker images
    REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
    node                  latest              6f6ffe2a1302        2 days ago          669MB
    hello-world         latest              1815c82652c0        2 months ago        1.84kB


## 引用
<hr/>

* [Docker-machine-driver-xhyve](https://github.com/zchee/docker-machine-driver-xhyve)
* [Use native virtualization on OS X docker with xhyve](https://gist.github.com/0x414A/0d5303b787a449cd564f)
* [How to install Docker on Mac OS using brew?](https://pilsniak.com/how-to-install-docker-on-mac-os-using-brew/)
* [Docker Practice](https://github.com/yeasy/docker_practice/blob/master/SUMMARY.md)
