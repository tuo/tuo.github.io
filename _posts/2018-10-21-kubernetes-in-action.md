---
layout: post
title: "Kubernetes in Action"
date: 2018-10-21 20:29:46 +0800
published: true
tags: #docker, #Kubernetes
---

一年前还写了一篇docker入门的博客，回头看看，其实一直也没机会花太多心思去搞， 因为目前这个jenkins + github + pm2部署虽然说不上特别体面，但是对于刚刚开始的小项目或者说大部分项目目前的流量都是非常小的， 本着这个lean原则，基本上都够用。感觉用上docker或者kubernetes有点牛刀小试，一方面镜像的推送拉取，虽然通过镜像加速，仍然不免有点费时费事；另外一方面没有大型应用的场景，为了技术而技术貌似有点多余。基本上因为环境不一致导致出现BUG的几率其实是相当少见的。当然因为最近有这么一个多租户的问题，需要做一些技术研究，同时抱着学习的态度，开始了解了下kubernetes. 在这个搭建和入门的过程中，我更加觉得系统架构的演化是需要配合实际业务现实场景的要求的。 这中间主要是看了kubernetes官方的一些教程，感觉还是有点稀里糊涂；后面看到了一本kubernetes in action，由浅入深讲的真是非常不错。


## Hello World

学习一个新技术了解一个新东西，好比跟学车学驾驶一辆车辆类似的： 直接上来讲道理，估计没人有兴趣了解；但是如果你让他先倒腾两下，转转方向盘，踩踩油门，挂挡，在空白的道路上来这么两下，有了这个亲身体会，后面你跟他讲这个原理，那么他能联系起来理解也更到位。

[Minikube](https://kubernetes.io/docs/setup/minikube/) 可以让你最快的在本地跑起来在虚拟机内部的一个单节点的Kubernetes[集群/Cluster](https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-architecture)。跑了一遍之后，你大概就知道这玩意还是蛮重的,还有很多的概念名词，物理上的服务器网络，还有[核心概念](https://kubernetes.io/docs/concepts/)(Service, Pod, Node, ReplicationController, Replicaset, Deployment...)等等，相当的头大。

当然跑个本地单机能让你基本了解，但是很多东西没办法真的模拟真实的的多节点的情况。比对了下，大致一般两种，一种是自建的，还有一种是用云服务商提供的。可以参考[阿里云 Kubernetes vs. 自建 Kubernetes](https://help.aliyun.com/document_detail/86420.html)


![自建不容易](http://d2h13boa5ecwll.cloudfront.net/misc/47267351-39a7fa80-d575-11e8-861c-12f545de4e01.png)

亚马逊AWS有[EKS](https://aws.amazon.com/eks/)，Google有[GKE](https://cloud.google.com/kubernetes-engine/)，听起来是挺不错的，但是问题是直接用云的了， 一方面比较贵，特别是阿里云，master node必须3个，加上两个node,随便一下一个月就一万多快，坑爹；另外一方面自建能够帮助更好的理解kubernetes（虽然碰到很多坑 NAS, EIP, ELB, ALB, EBS) 算了下， 假设咱模拟的话 至少一个master节点+两个node节点，这才是一个体面的集群，也符合咱体面程序员的最低要求。大致看了看，发现[kops](https://github.com/kubernetes/kops)仓库的帖子的讨论里[Estimated costs for smallest cluster on AWS & GCE?](https://github.com/kubernetes/kops/issues/4867)谈到了
![aws 价格](http://d2h13boa5ecwll.cloudfront.net/misc/47267330-de760800-d574-11e8-8dec-c8229b7fdb4c.png)
看起来还蛮便宜啊，一个月$150美元，包括3台t3.medium的机子加上128G EBS存储, 一个ELB(负载均衡)还有10MB的s3存储（需要存储集群的配置和元数据）。感觉可以搞一把试试。


<br/>
## 在AWS上搭建kubernetes

首先搭建Kuberetes集群，虽然官方提供了kubeadmin, 但是kops显然更加方便强大。

可以参考[Installing Kubernetes on AWS with kops](https://kubernetes.io/docs/setup/custom-cloud/kops/) 或者这篇文章[Setting Up a Kubernetes Cluster on AWS in 5 Minutes](https://ramhiser.com/post/2018-05-20-setting-up-a-kubernetes-cluster-on-aws-in-5-minutes/)

命令加起来并不多，但是有一些要注意的地方。 一个是地区region要保持一致，比如我这里选择了us-west-2（Oregon); 另外一个是


	kops create cluster --node-count=2 --node-size=t2.micro --master-size=t2.micro --zones=us-west-2a

这里--node-size和--master-size选择是明确的指定了*t2.micro* 也就是免费级别[AWS Free Tier](https://aws.amazon.com/free/), 理论上说免费一个节点一个月，因为我们创建了3个，所以可能咱们只能玩1/3个月，后面就需要收费了， 但是相比之前$150那个t3.medium还是便宜不少，虽然只有一个CPU，后面试了试，也没什么问题（GPU和内存都没有爆，即使创建了很多Pod),但是什么ELB就得收费了尽管便宜, s3有5G足够够用。


![untitled-1](http://d2h13boa5ecwll.cloudfront.net/misc/47267713-221f4080-d57a-11e8-97c9-8d9df7c4bf48.jpg)


跑完之后，运行 **kops validate cluster**, 应该看到上面的输出，然后去AWS的console里验证一下有没有三个ec2实例运行。

看起来不错，现在可以装一个web ui的[kubernete dashboard](https://github.com/kubernetes/dashboard)来看看。



<img width="800" alt="screen shot 2018-10-18 at 19 51 38" src="http://d2h13boa5ecwll.cloudfront.net/misc/47267810-3dd71680-d57b-11e8-88db-b789d8f33f37.png">



<br/>
## kubectl


搭建了好了集群，你现在可以通过kubectl命令来远程操作集群了。 [Overview of kubectl](https://kubernetes.io/docs/reference/kubectl/overview/) 提到了它的各种命令和详细用途， 比如好用的就是这个缩写。 但是经常打这个kubectl get po -o wide 或者其他的命令，有时候过于繁琐，虽然缩写可以减少部分的打字。



>	We’re using the abbreviation rc instead of replicationcontroller.
	Most resource types have an abbreviation like this so you don’t have to type
	the full name (for example, po for pods, svc for services, and so on).


这时候可以考虑用到zsh的补全提示[zsh-kubectl-prompt](https://github.com/superbrothers/zsh-kubectl-prompt)和插件[Kubectl plugin](https://github.com/robbyrussell/oh-my-zsh/tree/master/plugins/kubectl)来简化打字。


<br/>

## Kubernetes in Action

这本书由浅到深的讲解了为什么使用容器技术，以及kubernetes的基础知识和概率以及最后深入探究内部实现。

正如之前你看到的那么多kuberenetes的核心概念，还包括物理上的各种技术网络存储服务器通讯等等，官方文档还是无法一步一步带你入门深入串起来来更好的理解，而不是被这些术语给淹没掉。而kubernetes的核心概念： 一个是imperative,一个是abstraction/encapsulation. 封装底层实现的细节， 比如deployment -> replicasets -> pods 等等从而暴露出最简单明了而且风格统一的操作命令，这个封装还包括物理上的。


![](http://d2h13boa5ecwll.cloudfront.net/misc/47267938-e6d24100-d57c-11e8-91d4-b7957352b397.png)
<img width="801" alt="screen shot 2018-10-21 at 22 25 38" src="http://d2h13boa5ecwll.cloudfront.net/misc/47268183-467e1b80-d580-11e8-8f90-e99bbcb612ef.png">
<img width="753" alt="screen shot 2018-10-21 at 22 25 27" src="http://d2h13boa5ecwll.cloudfront.net/misc/47268184-467e1b80-d580-11e8-92dd-f7f8f4190343.png">


PDF里我做了很多笔记，但是太多了，无法贴上来，总而言之这本书应该非常适合入门。动手完helloworld自后，在看这本书，感觉很多东西都豁然开朗。 这本书你应该只需要读前两部分，大概是接近300页英文左右，后面一部分讲的是内核和实现，后面有经验了可以反过头来阅读。



## 花费

![cost](http://d2h13boa5ecwll.cloudfront.net/misc/47268065-9956d380-d57e-11e8-868b-22947bc0d112.png)


大家可以看看3台EC2其实只跑了188个小时，离750小时还是差蛮多的；EBS是我测试PersistentVolume一部分； 这里面有一个ELB（Elastic Load Balancing)的计费有点意思。

其实这个ELB还是蛮贵的，很多现实的里面很大部分费用因为过多的ELB实例产生的。为什么会有这么多? 它怎么来的了？

> The big downside is that each service you expose with a LoadBalancer will get its own IP address, and you have to pay for a LoadBalancer per exposed service, which can get expensive!

也就是当你expose暴露服务给外部访问时，选的是load balancer类型的话，亚马逊平台的负载均衡会分配一个实例给它用来给外部访问，所以你可以想象。


怎么办了？ 这里要提到上面截图里有一个Ingress.


![kubernetes_with_ingress_aws](http://d2h13boa5ecwll.cloudfront.net/misc/47268147-b17b2280-d57f-11e8-804c-b4760d46b916.png)

相当于ELB和Service中间加了一层. 这样减少ELB的使用，甚至一个就可以了。

更多可以参考

[Save on your AWS bill with Kubernetes Ingress](https://itnext.io/save-on-your-aws-bill-with-kubernetes-ingress-148214a79dcb)

[AWS Cost Savings by Utilizing Kubernetes Ingress with Classic ELB](https://akomljen.com/aws-cost-savings-by-utilizing-kubernetes-ingress-with-classic-elb/)
