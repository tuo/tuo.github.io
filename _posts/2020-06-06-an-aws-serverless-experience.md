---
layout: post
title: "An AWS Serverless Experience (esp China)"
date: 2020-06-06 21:54:32 +0800
published: true
tags: aws serverless,aws, SAM
---

## Background

A couple of months ago, we got a project which need implement sth like IoT like running or jogging apps but slightly different. Basically the backend admin could design specfic route for tasks(like delivery service), users could compete for the tasks to get bonus. Once user got the task from the app, he could start the task according to the route info and upload its coordinates like every 10 seconds. Then the manager in dashboard could live monitoring echo ones's progress on the map.  Nothing too complicated, plus user could take photo of some receipt(like invoice) , upload it and backend should be able to do some OCR to extract correct amount of money. Every monthly or weekly, some reports should generated for analysis.


Technical demands from client:

	1. sort IoT style project; (DynamoDB for gps)
	2. need use Python or Java for language stack; 
	3. Serverless structure based on AWS infrasture (Favoring AWS native techstack)
	4. has to work in China (e.g. use AWS CN)
	
	
For second point, i.e, language part, given that there isn't too much about transaction, and Java is obviously heavier comparing to Python, so Python looks like no brainer to us. There is a good video from AWS Reinvent 2019 on Java on AWS serverless: [AWS re:Invent 2019: [REPEAT 1] Best practices for AWS Lambda and Java (SVS403-R1)](https://www.youtube.com/watch?v=ddg1u5HLwg8).

#### Framework Options

Initially we start with raw AWS tech stack to get familiar little bit (As none of us have any experience with Serverless, only some Docker and Kubernetes before), playing IAM, APIGateway, Lambda, CloudFormation, DynamoDB and RDS (the database is set to use Postgresql) with online editor. Not too bad for getting our feet wet. Once we got the concept of those, we found that [The AWS Serverless Application Model (SAM) ](https://amazonaws-china.com/serverless/sam/) looks like a decent way for developers to work with. We could weave infrasture-as-code(simplified CloudFormation) templates with actual bussiness code (python here), streamlining the development and deploy process.

Still you need write quite lots of configuration code, even though your main focus should be on actual business code. 
After some investigation, we could Serverless Framework/AWS Chalice/Zapper/Claudia.js)

![](/var/folders/zj/rd6p8_fx1rd6k171c2qn703w0000gn/T/TemporaryItems/(A Document Being Saved By screencaptureui 4)/Screenshot 2020-06-06 at 15.52.15.png)

Now obvisouly the [Serverless Framework](https://www.serverless.com/) is most popular one, it even works with Aliyun(Chinese version of AWS), and it really extract out lots of low-level details and help developer to focus on business logic development. But client reject this as they dont' think it is AWS native enough to make best out of AWS's potentials :(  Maybe? There are some key differences between AWS international and AWS China which mightn't work in China Region if we dig deeper later.

[AWS Chalice](https://chalice.readthedocs.io/en/latest/) looks promising as it is coming out of AWS's own hands. 

TODO: insertpicture

Neat, nice and super developer-freindly. But here is imporant part, AWS and AWS China are different. Like some discussions here and there on github: [Add support for China region #792
](https://github.com/aws/chalice/issues/792), [Using serverless framework for deployment in China region](https://forum.serverless.com/t/using-serverless-framework-for-deployment-in-china-region/3468), [Bring basic support for AWS China #1564](https://github.com/Miserlou/Zappa/issues/1564)

some are already or could be resolved or supported by AWS China like:

* environment varaibles (EnvironmentVariablesFeature) - later supported
* EDGE API gateway to set to REGIONAL
* 403 - Ensure your domain is ICP listed (or you just want to play with it now, ensure you explicitly open a ticket in AWS China panel asking about open temporay API Gateway permission)

The biggest one is that `${AWS:Partition}` is different according to [AWS ARN and namespace](https://docs.aws.amazon.com/zh_cn/general/latest/gr/aws-arns-and-namespaces.html).

some resources, s3 or iam, for example,  `arn:aws:s3:::my_corporate_bucket/*`, would be `arn:aws-cn:s3:::my_corporate_bucket/*`. Also not every AWS service are supported in China Region: [aws china region product services listS](https://www.amazonaws.cn/en/about-aws/regional-product-services/), for example, one key part of CI/CD [CodePipeline](https://aws.amazon.com/codepipeline/) is missing in China region, but CodeBuild and CodeDeploy is supported, so later we need replace it with Jenkins (and help of some plugins) to customize CI/CD flow.

In conclusion, we choose SAM and plain python(no web framework here) for develop backend.

#### Module Breakdown

In microservice specially, with some reminsicence of old day Java OO programming, `Single Responsibility Principle` always caught me. Robert.C.Martin, long time ago in his book《Agile software development principles, patterns, and practices》, mentioned five OO principles, and first is the SRP. This applies to Class/Function etc, not for code perfectionist, as it stands for good abstraction, better cognition and easy understanding. Each lambda in AWS represent a business unit, and it should and just do what it needs to do, nothing more or less. Like superstitious/obscure theology, followed by Age of Reason and Englightment, everything should be based on logic, but even emotions and human affections? lets pause here for Romanticism, no doctrine will be silverblullet as context always evovles.

In serverless world, we need consider here:

* Single Responsibility Principle - easy test, lightweight, faster startup time (cold)
* lifecycle/duration/frequences - there could one off or long time running
* event source - how does this got triggered ? (from s3, or request or ....)
* resource/permission applied













