---
layout: post
title: "An AWS Serverless Experience"
date: 2020-06-06 22:55:32 +0800
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

![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/framework.png)

Now obvisouly the [Serverless Framework](https://www.serverless.com/) is most popular one, it even works with Aliyun(Chinese version of AWS), and it really extract out lots of low-level details and help developer to focus on business logic development. But client reject this as they dont' think it is AWS native enough to make best out of AWS's potentials :(  Maybe? There are some key differences between AWS international and AWS China which mightn't work in China Region if we dig deeper later.

[AWS Chalice](https://chalice.readthedocs.io/en/latest/) looks promising as it is coming out of AWS's own hands. 

![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/chalice.png)

Neat, nice and super developer-freindly. But here is imporant part, AWS and AWS China are different. Like some discussions here and there on github: [Add support for China region #792
](https://github.com/aws/chalice/issues/792), [Using serverless framework for deployment in China region](https://forum.serverless.com/t/using-serverless-framework-for-deployment-in-china-region/3468), [Bring basic support for AWS China #1564](https://github.com/Miserlou/Zappa/issues/1564)

some are already or could be resolved or supported by AWS China like:

* environment varaibles (EnvironmentVariablesFeature) - later supported
* EDGE API gateway to set to REGIONAL
* 403 - Ensure your domain is ICP listed (or you just want to play with it now, ensure you explicitly open a ticket in AWS China panel asking about open temporay API Gateway permission)

The biggest one is that `${AWS:Partition}` is different according to [AWS ARN and namespace](https://docs.aws.amazon.com/zh_cn/general/latest/gr/aws-arns-and-namespaces.html). Also there some services are not supported in China region, like AWS AppSync. 

some resources, s3 or iam, for example,  `arn:aws:s3:::my_corporate_bucket/*`, would be `arn:aws-cn:s3:::my_corporate_bucket/*`. Also not every AWS service are supported in China Region: [aws china region product services listS](https://www.amazonaws.cn/en/about-aws/regional-product-services/), for example, one key part of CI/CD [CodePipeline](https://aws.amazon.com/codepipeline/) is missing in China region, but CodeBuild and CodeDeploy is supported, so later we need replace it with Jenkins (and help of some plugins) to customize CI/CD flow.

In conclusion, we choose SAM and plain python(no web framework here) for develop backend.

#### Module Breakdown

In microservice specially, with some reminsicence of old day Java OO programming, `Single Responsibility Principle` always caught me. Robert.C.Martin, long time ago in his book[《Agile software development principles, patterns, and practices》](https://www.amazon.com/Software-Development-Principles-Patterns-Practices/dp/0135974445), mentioned five OO principles, and first is the SRP/Separate of concerns. This applies to Class/Function etc, not for code perfectionist, as it stands for good abstraction, better cognition and easy understanding. Each lambda in AWS represent a business unit, and it should and just do what it needs to do, nothing more or less. Like superstitious/obscure theology, followed by Age of Reason(btw, salute to George Carlin) and Englightment, everything should be based on its logic, but even emotions and human affections? lets pause here for Romanticism, no doctrine will be silver blullet as context always evovles.

In serverless world, we need consider here:

* Single Responsibility Principle and decomposition - easy test, lightweight, faster startup time (cold)
* lifecycle/duration/frequences - there could one off or long time running
* event source - how does this got triggered ? (from s3, or request or ....)
* resources/permissions applied
* pricing

![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/systemstructure.png)




## Development

#### Code structure

There are many ways to organzie the code structure. For example, for CRUD case, you could have this:


	team
	├── create
	│   ├── app.py
	│   └── requirements.txt
	├── get
	│   ├── app.py
	│   └── requirements.txt
	├── list
	│   ├── app.py
	│   └── requirements.txt
	└── update
	    ├── app.py
	    └── requirements.txt
	
or you could put CRUD in one app.py like old days:

	team
	├── app.py
	├── requirements.txt

and in template.yaml you could declare the function:

![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/template%20function%20yaml.png)

When you run `sam build --debug`, from the logs:


![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/sam%20build%20log.png)


from official website on [sam build](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html):

> The sam build command processes your AWS SAM template file, application code, and any applicable language-specific files and dependencies, and copies build artifacts in the format and location expected by subsequent steps in your workflow. You specify dependencies in a manifest file that you include in your application, such as requirements.txt for Python functions, or package.json for Node.js functions.

So it loops each folder then run pip install there, and copy the source code and installed packages to `.aws-sam/build` folder.

![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/sambuild_output.png)

Then when later sam package/deploy, it will zip the whole folder `AdminAuthFunction` and upload to somehere in s3. Once the aws try to execute lambda, it need do some warming up, setup basics, pull the zipped code from s3, unzip it and etc.If the code zipped size is smaller, it would means faster cold start (downloading faster) and less code mess, as it only contains what it needs. 

Personally I favor the second one, as later I would mention about the swagger definitions, - which I think `swagger(API)` , `template yaml(Resource)`, `app.py(Code)` and `requirements.txt(Dependencies)` should be one single unit as it represent one self-contained bussiness logic. (This is some cons of the current aws stack, I will elaborate it later)


#### Share code

To share code inside different services, we could use language specfic solution like npm or pip. Here multiple services share some common logic like utils are pretty common cases. One thing about use pip/npm package, is that it is not easy or nature to integrate with part of development process. Also each service need download the dependencies separately when cold startup.

[AWS Lambda layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html) are pretty useful here.

> You can configure your Lambda function to pull in additional code and content in the form of layers. A layer is a ZIP archive that contains libraries, a custom runtime, or other dependencies. With layers, you can use libraries in your function without needing to include them in your deployment package.

[Working with AWS Lambda and Lambda Layers in AWS SAM](https://amazonaws-china.com/blogs/compute/working-with-aws-lambda-and-lambda-layers-in-aws-sam/) give pretty good example on how it use with SAM to be part of dev process by directly declare and use it in your sam templates.yaml.

One good use of layer is to lock down system-wide built-in dependencies explicitly, like bot3.


#### Different environments

There are some good SAM best practices from AWS talks and docs. Some are quite practical ones:

* ideally have seperate AWS accounts for different dev/uat/prod environments
* use AWS System Manger - [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) for keys or secrets/credentails(e.g password) rather than plain hard-coded in code.
* APIGateway Stage Variables
* Use Parameters and Mappings 



## Test and Deploy

#### Local Dev/Test
After `sam build`, you could run `sam local start-api` to start locally to debug and test it.


	Mounting CreateOrderFunction at http://127.0.0.1:3000/orders [POST, OPTIONS]
	Mounting ListCarFunction at http://127.0.0.1:3000/cars [GET, OPTIONS]
	You can now browse to the above endpoints to invoke your functions. You do not need to restart/reload SAM CLI while working on your functions, changes will be reflected instantly/automatically. You only need to restart SAM CLI if you update your AWS SAM template
	2020-06-06 18:51:23  * Running on http://127.0.0.1:3000/ (Press CTRL+C to quit)
	
	
on my mac, `SAM CLI, version 0.41.0`, I got interested on this line:

*You can now browse to the above endpoints to invoke your functions. You do not need to restart/reload SAM CLI while working on your functions, changes will be reflected instantly/automatically. You only need to restart SAM CLI if you update your AWS SAM template*


![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/output.png)


But truth is, when I just change the code, and call via curl again, nothing happened. But as I guess, it is when you actually do `curl http://127.0.0.1:3000/orders` , only then SAM will try to invoke the lambda, download docker images (runtime, layer etc), and mount 

> Mounting /Users/tuo/Documents/6e/xxx/backend/route-api/.aws-sam/build/ListOrderFunction as /var/task:ro,delegated inside runtime container

from .aws-sam/build to docker container's volume. So either it means `sam build` has some magic watch command ? or there is an option of `watch` in sam build command? But nope, I didn't find any like that in manual.


So what you could do is just simply go to `.aws-sam/build` folder , find the correct function directory and directly modify from it. But you're gonna remember to add it back to source code when done, or if you run `sam build` accidentally (I guarantee you that it will, as I did that a couple of times and lost all codes/changes even if jetbrain smartest IDE could'nt get it back from my GOAT feature, i.e, [Local History: in IntelliJ IDEA May Save Your Life Code](https://blog.jetbrains.com/idea/2020/02/local-history-in-intellij-idea-may-save-your-life-code/)). No git stash or git commit or what so ever, because it often got git ignored! Hoorooooooay !

I will talk a little bit improvement later for this process. But lets continue for deploy part. 


#### Deploy

After you run `sam build`, you probably notice in terimal, you could do `sam deploy --guided`. But if you like me, are in China, you know it won't - same arn parition problem.

So you need:


   * create s3 sbucket for deploy (only once if bucket doesn't exist)
        
         aws s3 mb s3://tuo-serverless-artifact

   * sam upload package
   
         sam package --output-template-file packaged.yaml --s3-bucket tuo-serverless-artifact

   * sam deploy package 
   
         sam deploy --template-file packaged.yaml --region cn-north-1 --capabilities CAPABILITY_IAM --stack-name demo-tuo-api  --s3-bucket tuo-serverless-artifact --confirm-changeset


But how about you need have some decent CI/CD for automating deploy process?  


![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/cicd.png)

Unfortunately, the codepipeline is not supported in China, we need use Jenkins/TravisCI for replacement. You could use the jenkins plugin [AWS CodeBuild](https://plugins.jenkins.io/aws-codebuild/) with github to setup code trigger to codebuild process.


![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/codebuild.png)


![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/jenkins.png)


CodeBuild basically do sam build and package, after that the zip and artifact should be upload to s3 ready for aws cloudformation to deploy.


Here is a pretty tutorial on Jenkins with CodeBuild&CodeDeploy from aws blog: [Setting up a CI/CD pipeline by integrating Jenkins with AWS CodeBuild and AWS CodeDeploy](https://amazonaws-china.com/blogs/devops/setting-up-a-ci-cd-pipeline-by-integrating-jenkins-with-aws-codebuild-and-aws-codedeploy/). My experience with this is that this process is very long and error-prone, sometimes you need step back and think why and it might not fit perfectly on your case, and twist little bit.



## Drawbacks and Limitations

let's review what are some limitations from aws serverless and SAM.


#### `sam build` is slow

There is some issue on github: ["sam build" feedback: Support incremental builds #805](https://github.com/awslabs/aws-sam-cli/issues/805).

One of reason, as I mentioned earilier, it is need loop folder, and run `pip install requiments.txt` everytime, even if you didn't change it.And I didn't see it uses any cache for quick install. (I did that by `time` sam build command for clean install and later install, and pretty much no differences. plus we could use --debug to see details).

One way would be to use `sam build help` to list all functions and only run functions you have changes and want to build for that specific service like `sam build AdminAuthFunction`. But this would add cognition overhead, as we need shift our mindset from for example: team -> create -> app.py to `CreateTeamFunction` in template.yaml(see reverse order). I guess you could make naming and folder structure consistent by for example, function name in templates.yaml should be `{parent}capitialize{sub}` like `team->create` folder to `teamCreate` function name in templates.yaml, whicy is way easier when you need navigate from aws console's lambda panel to locate function.

if you are in China, you could run change pip source to use Chinese package index. Plus you could do quick smoke test directly inside .aws-sam/build folder.

But any good way to help this process? One propose would be:

	Loop each folder, check if reuqiments.txt is changed or not(save as md5 signaure and compare with it ).
	If this md5 doesn’t match new one, then pip install and copy packages to build folder, and copy the all code inside directory
	If md5 same, just copy the source code

Copying source code is pretty lightweight and fast. I haven't got some time working on this but I guess Gulp could be good tool like what we did old days to watch scss/js changes.
 

#### sam local start-api is slow 

One good way to speed up is to add `--skip-pull-image` to the command to skip re-download if you have it already.

But the most painful part is it need start new container and mount volume etc everytime you request it. There is one ticket [Feature request: make it possible to keep docker container warm](https://github.com/awslabs/aws-sam-cli/issues/239) but author said aws team is review and prioritize this task. I guess in short term, it wouldn't be ready. 

![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/templateyamlreference1.png)

![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/templateyamlreference2.png)

Okay, so `sam build`  one single function(empty requirement.txt, no dependency at all, but stil it need run pip install) takes 1.0 seconds and an request to it takes like in above picture 13~ seconds even thought it is the second time requesting.

And there is not watch for sam build, you need manually switch back and forth between terminals panels and typing different commands.

#### Can't run custom authorizer locally with API Gateway

[Feature Request: API Gateway Authorizer support in SAM Local #137](https://github.com/awslabs/aws-sam-cli/issues/137). 

We need add JWT for custom authorizer with cors support. But we can't test this locally somehow. I understand the whole thing, docker etc, aws team try to minick the real production environment with consistency to help migitate the pains of the this-thing-doesn't-work-on-my-laptop. It did! But obvisouly something still need to work on more.


#### separation of concerns

let's give a quick glance of template.yaml I got from other project which given as a sample or refeference for my team/project to refer to. (live in production, not some random/fake ones from internet). I did learn a lot from those references, but I found it has some problems.



![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/bigyaml1.png)
![Framework List](https://blog-1255311287.cos.ap-shanghai.myqcloud.com/20200606aws/bigyaml2.png)


For APIGateway yamls, which mainly containes parameters and mappings, swagger api definition and other resources, has over 3 thousands lines. That's pretty insane! Imagine you need change some part of code here, it would be undigestible and super hard to locate and change it. Just imagine again, you need change some swagger mapping template in velocity language in a yaml file.

After a quick look, I found the swagger api definition part takes the most. Again, my two months development experiences from novice tells me that there is some thing could be improved.

The thing is that I need constantly jump between python code and template.yaml to change both, which is kinda really painful. The python code containers source code and dependecies, and template.yaml containes instrastructure related and api definitions. Remember, take for example, rails or expressjs, you have controllers/services/models/routes in separate folders, meaning you have `user` model, you need have user-related code in 4 or even folders, well what they do is just simply cooperate to do one sth - user. 

So as I mentioned previously, it would be better that it wraps around the business logic.

	list
	├── app.py
	├── requirements.txt
	├── swagger.yaml
	└── template.yaml

Each service or business logic has source code, dependency, swagger api and template.yaml for IaC. But too fine-grained level would simply introduce more botherings, also there are some real-world limitations we need consider.


	team
	├── create
	│   ├── app.py
	│   └── requirements.txt
	├── get
	│   ├── app.py
	│   └── requirements.txt
	├── list
	│   ├── app.py
	│   └── requirements.txt
	├── swagger.yaml
	├── template.yaml
	└── update
	    ├── app.py
	    └── requirements.txt


This looks like a good comproise. You could have swagger.yaml self-container for a `resource` , same for template.yaml. But how could we need merge those yamls together?

we could use some yaml merging tools like [yamlinc](https://github.com/javanile/yamlinc) and swagger tools also. AWS SAM support include swagger.yaml file but only that file is somehere in s3 which is url - so it is still not 100% integrated in dev process.

All those means we need change your build process little bit and we might need write some custom Makefile etc to achieve that, but it should be possible if we could achieve better development, easy maintance and so on.


## Notes


#### Traffic control 

Pricing is big consideration. But we need think before that, in a systematic way. What might be the bottleneck of the system? We need control the flow and spikes so it wouldn't take down service or spinning too many instances with no-availbility at all.  Here the IoT, user will frequently upload there gps coordinates, how we prepare for that?  we could Kinesis or simple SQS to do the aborbe and fine control the rate. 

Also we need understand about the Lambda's burst model, cold-start and warm start and do some benchmark to get reason memory/cpu allocated for best performances and good money-savings.

In traditional architecture, the database (relational one) or disk-related file writing/reading are kinda bottleneck. We might try to use s3 or nosql database for most time. But if we need use that, e.g. postgresql/mysql(RDS), we need take extra care for not allowing database become the bottleneck of system. 

For example, a VPC does sound good idea, but in somecase, if not used properly it will exhaust the ip pool and cause lambda keep piling up (if not configured and twisted properly). Also VPC could slow down the cold start time significantly.


#### Read through documentation 

There are quite lots of concept and techs in AWS serverless if you, like me, never learned that before. AWS has lots of greate resources online. The aws re-invent and aws online talks are pretty good, covering tons of topics, which is really good opportunity to learn. I found interesting about take new skills or techs is that we all gonna go through following stages:

* step1: follow some tutorials 
* step2: get hands dirty , play with demos
* step3: okay, I got it basically, then can't wait start real coding 
* step4: xxx


There is an impulse/urge to jump to detail implementation - instant gratification for self-proving ?  But often later, we got caught in big hole and sometimes got driven crazy as felt no way to get out of it, esp, when time is not on your side. Maybe you need deliver some features before deadline?

How many times have I made those similar mistakes, not only in coding but other area of life too?

After step1 and step2, you're good, as you know basically how it works. And jump to nuts and bolts is fine. What's wrong? you need step back and look from a big view when needed. Always go back to basic and origin, take some dumb time to read through documentations always saves me big time later. No one likes to read docs, (like APIGateway, Lambda, IAM, CloudFormation, SAM, CodeBuild, CodePipeline, CodeDeploy), it is not fun at all. But it is a must, you could try with comparing to tech/skill/language that you already familiar with, yeah, diverting your attention and make it little bit more fun. 

 
> A good programmer should be good to always jump back and forth between abstraction and implementation.
 

Anyway I think AWS Serverless is pretty fun and interesting tech to learn and use. Hope they could improve their ecosystem around it to provide better development experience in the future.


 







