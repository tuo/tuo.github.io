---
layout: post
title: "NestJS+Prisma Dockerfile 构建优化"
date: 2022-06-10 12:55:32 +0800
published: true
tags: nestjs,prisma,docker,dockerfile
---


最近接触一个项目是用[NestJS7.0](https://nestjs.com/)和[Prisma3.1.1](https://www.prisma.io/)作为技术栈来开发的后端，用这两个原因很明显：原生支持Typescript，前后端都可以用上JS的技术栈，后端相对来说更符合上云这个轻量化要求。NestJS这边的大概有三个模块: backend, frontend和frontend-emp, 大体还是根据面向的前端不同做的粗糙的划分， libs里面有一些公共的组件库，比如prisma关联一些迁移脚本和数据库表的定义。

```terminal
├── Dockerfile.backend
├── Dockerfile.frontend
├── Dockerfile.frontend-emp
├── README.md
├── apps
│   ├── dashboard
│   │   ├── src/**
│   │   └── tsconfig.app.json
│   ├── frontend
│   │   ├── src/**
│   │   └── tsconfig.app.json
│   └── frontend-emp
│       ├── src/**
│       └── tsconfig.app.json
├── assets
├── font
│   └── 微软�\233\205�\221.ttf
├── libs
│   ├── db
│   │   ├── prisma
│   │   |   ├── migrations/**
│   │   |   ├── schema.prisma
│   │   ├── src
│   │   └── tsconfig.lib.json
│   ├── shared
│       ├── src
│       └── tsconfig.lib.json
├── nest-cli.json
├── package.json
├── patches
│   └── exceljs+4.3.0.patch
├── tsconfig.build.json
├── tsconfig.json
├── webpack-hmr.config.js
├── yarn.lock
└── �\225��\215�说�\230\216.md

```

Prisma中关于表的定义是在libs/db/prisma/schema.prisma里，DSL大概写出来是这样的：

```js
generator client {
    provider        = "prisma-client-js"
    previewFeatures = ["filterJson"]
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

model User {
    id        Int       @id @default(autoincrement())
    uid       String?   @default(uuid()) @db.Uuid // 用户UID 用来reset password
    name      String // 名字
    ...
}
```

数据库的连接串是从环境变量DATABASE_URL拿到. 每次修改schema.prisma，都需要运行prisma migrate dev生成迁移脚本，同时运行prisma generate可以生成基于TS的客户端@prisma/client来直接使用。

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB*
await this.prisma.user.findMany({...})
```

![prismaGenerate](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaGenerate.png)
<cite> Prisma Concept [Generating the client](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)</cite>

## Prisma上Dockerfile 

接下来需要将该应用打包为Docker镜像，部署到Kuberntes的集群里。一开始的Dockerfie是这样的：

```docker
FROM node:16-alpine 

WORKDIR /home/node
COPY . /home/node

RUN yarn install 
RUN yarn prisma generate   

ENV NODE_ENV production
RUN yarn run build-frontend
EXPOSE 7021

CMD ["node", "dist/apps/frontend/main.js"]
```

第一条指令是选定了合适的基础镜像包： 基于Alpine Linux轻量级操作系统镜像上NodeJS v16版本。这块可以看看https://hub.docker.com/_/node，几乎每个版本都有默认，bullseye和alpine等等版本，对应的每个镜像包含的功能和大小也是不一样的，可以进一步到github查看其原始的Dockfile定义. 后续的指令就是将本地源文件都复制到镜像中，并运行yarn install安装依赖，prisma generate生成@prisma/client， nest build生成dist， 最后*"node", "dist/apps/frontend/main.js*运行整个程序。

### Prisma Generate报错

​    当运行*docker build -t frontend-api  -f ./Dockerfile.frontend .*来构建这个镜像时候，会在*RUN yarn prisma generate*报如下错误：

 
![prismaGenerateErr.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaGenerateErr.png)

```terminal
#9 3.978 Prisma schema loaded from libs/db/prisma/schema.prisma  
#9 4.849 Error: Unable to require(*/home/node/node_modules/prisma/libquery_engine-linux-musl.so.node*)
#9 4.849  Error loading shared library libssl.so.1.1: No such file or directory (needed by /home/node/node_modules/prisma/libquery_engine-linux-musl.so.node)
```

看起来这里有两点：第一点无法加载 `libssl.so.1.1`这个共享库，第二点这个库是被`node_modules/prisma/libquery_engine-linux-musl.so.node`所依赖。

简单的从名字可以推测出来是关于SSL的，有可能是OpenSSL 1.1这个库没有安装，所以无法引用到。 进一步搜索libssl.so.1.1可发现[Openssl can't find libssl.so.1.1 and libcrypto.so.1.1 · Issue #19497 · openssl/openssl (github.com)](https://github.com/openssl/openssl/issues/19497)和Prisma官方的github issues [Support OpenSSL 3.0 for Alpine Linux · Issue #16553 · prisma/prisma (github.com)](https://github.com/prisma/prisma/issues/16553) 中其他人类似的问题反馈可以验证之前的猜想。沿着这个基础镜像往上推导，可以找出到底这个基础镜像包含哪些基础的依赖或者组件库，是否有OpenSSL还是说OpenSSL有但是版本不对等等，从dockerhub的Node镜像地址直接进入到Github对应的Dockfile定义[docker-node/16/alpine3.15/Dockerfile](ps://github.com/nodejs/docker-node/blob/3760675a3f78207605d579f366facbb0d9f26de5/16/alpine3.15/Dockerfile):

```docker
FROM alpine:3.15
ENV NODE_VERSION 16.13.1
...
  && apk add --no-cache --virtual .build-deps-full \
        binutils-gold \
        g++ \
        gcc \
        gnupg \
        libgcc \
        linux-headers \
        make \
        python3 \
  && yarn --version        
```

这里可以看到具体node-16:alpine是基于哪个NodeJS的版本和哪个Linux Alpine的发布: 16.13.1和3.15，后续当docker run起来之后可以*cat /etc/os-release*进一步确认。下面接着安装NodeJS和基础的开发依赖，里面是没有openssl这个库的。这个问题就变成了如何在prisma generate之前安装这个openssl1.1这个组件， 这就很简单了，使用APK安装即可：

```docker
FROM node:16-alpine 
WORKDIR /home/node
COPY . /home/node

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories #国内换成阿里
RUN apk update  #更新apk来源，保证可以拉倒最新的包信息
RUN apk add openssl1.1-compat #安装openssl 1.1
```

重新docker build一下，构建成功！

### Prisma Generate原理

虽然目前这个问题看起来是解决了，但是还有一个疑问这个*node_modules/prisma/libquery_engine-linux-musl.so.node*文件-引用SSL的-prisma的组件是干嘛用的，为什么需要引用，另外跟prisma generate有什么关系，这些是需要接下来搞清楚的。

查看官方文档说明[Generating the client (Concepts) (prisma.io)](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)，当运行*prisma generate*时候，prisma会在*node_modules/.prisma/client*下面生成三个组件：

  * ts类型定义 (index.d.ts)
  * JS代码 (index.js)
  * 查询引擎二进制文件（libquery_engine-xxx.xx.node）
  
下图是在本机MAC上的截图：

![prismaBinaryTarget.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaBinaryTarget.png)

回忆在当初安装*yarn add @prisma/client*这个包时. @prisma/client包其实有两部分组成：

    * The @prisma/client module itself, which only changes when you re-install the package:  *node_modules/@prisma/client* (重新安装包时才变化)
    * The .prisma/client folder, temporary, which is the default location for the unique Prisma Client generated from your schema: *node_modules/.prisma/client* （临时只有运行prisma generate就会重新生成）

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB*
await this.prisma.user.findMany({...})
```

在调用*this.prisma.user.findMany*时，Prisma Client客户端将findMany发送给查询引擎（NodeJS-API Library)，查询引擎将其翻译为SQL语句，然后发送给数据库；当数据库返回结果时，查询引擎将其翻译映射为JS对象，并发送回给Prisma Client客户端。

![prismaQueryEngine](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaQueryEngine.png)
<cite> Prisma Concept [Generating the client](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)</cite>


为了保证更高的效率，这个查询引擎针对每个不同的操作系统都做了相应的优化，都有相对应的编译出来的二进制文件。它命名的格式一般是 query-engine-PLATFORM或者libquery_engine-PLATFORM，这个PLATFORM指代不同的平台。比如我的电脑是macOS Intel， 操作系统是达尔文Darwin，那么对应的查询引擎的名字是libquery_engine-darwin.dylib.node，如果上图所示。在上面的Dockerfile里，操作系统是Alpine3.15，那么其对应的名称应该是什么了？ 在[Prisma schema API (Reference)](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options)，可以找到是，名字应该是*libquery_engine-linux-musl.so.node*:

![prismaEngineAlpine.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaEngineAlpine.png)

名称是*linux-musl*, 对应的要求依赖的openssl版本是1.1.x，所以上面才需要在From node-16:alpine指定之后安装openssl 1.1版本。但是在Prisma4.8.0之后，大概是2022十二月发布的版本，优化改进支持了OpenSSL 3.0: [Support OpenSSL 3.0 for Alpine Linu](https://github.com/prisma/prisma/issues/16553#top).

在CI上构建拉取*libquery_engine-linux-musl.so.node*的时候，有时候比较慢，可以加上*ENV PRISMA_BINARIES_MIRROR http://prisma-builds.s3-eu-west-1.amazonaws.com*来加速下载。

> 安装 OpenSSL 1.1 -> 下载该操作系统上的查询引擎二进制 -> prisma generate

### 如何数据迁移Prisma Migrate Deploy

接下来问题是如何跑迁移脚本： [Deploying database changes with Prisma Migrate](https://www.prisma.io/docs/guides/deployment/deploy-database-changes-with-prisma-migrate) 里提到要保证*./libs/db/prisma/migrations*文件夹存在然后在发布阶段跑*prisma migrate deploy* - 命令来自@prisma/client包， 而不建议在本地跑远程数据库的迁移。这里需要将package.json中的@prisma/client从devDependencies开发依赖挪到dependencies产品依赖，保证不会被CI或者部署平台(类似Vercel)prune修剪掉开发依赖导致无法运行命令。

```diff
- CMD ["node", "dist/apps/frontend/main.js"]  
+ ENTRYPOINT [ "npm" ,"run"]
+ CMD ["start:prod_frontend"]  
```

package.json:

```json
  "scripts": {
    "build-frontend": "nest build frontend",
    "start:prod_frontend": "yarn prisma migrate deploy && node dist/apps/frontend/main",
  }
  "prisma": {
     "schema": "libs/db/prisma/schema.prisma"
   }
```


![prismaMigrate.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaMigrate.png)



## Dockerfile优化

上一步将Prisma成功的集成到了Dockfile里，并且部署之后容器成功的跑了起来，看起来流程没有问题。但是这个打包的镜像非常大，有1.3G，并且构建时间非常长，这相当不利于CI/CD的快速迭代演化。

```terminal
server ➤ docker images                                                                                                                                                                                                                                              REPOSITORY     TAG       IMAGE ID       CREATED             SIZE
frontend-api   latest    93727cf78c85   About an hour ago   1.53GB
```

在怎么优化之前，可以先了解Docker如何根据Dockerfile里的指令构建镜像的。

```docker
FROM node:16-alpine  #Layer n
USER root            #Layer n+1   
WORKDIR /home/node   #Layer n+2
COPY . /home/node    #Layer n+3 
RUN yarn install     #Layer n+4
RUN apk update       #Layer n+5 
RUN apk add openssl1.1-compat #Layer n+6
RUN yarn prisma:generate      #Layer n+7 
ENV NODE_ENV production       #Layer n+8
RUN yarn run build-frontend   #Layer n+9
EXPOSE 7021                   #Layer n+10
  
ENTRYPOINT [ "npm" ,"run"]    #Layer n+11   
CMD ["start:prod_frontend"]   #Layer n+12
```

这个过程每一行指令就像堆积木一样不断在前面的层上面添加新的层。比如上面的基础层是Layer n 就是*From node:16-alpine*（本身内部也是由其他层堆叠起来），运到后面的指令比如*COPY . /home/node*表示将当前本地文件夹（context)的文件复制到镜像的新的一层Layer n+3, 位于Layer n+2之后。RUN这里主要用来安装一些系统依赖或者组件。这里重点关注在COPY和RUN这两个指令，一个是文件系统操作，一个是bash或者命令操作。 最终所有Dockfiler指令跑完之后，就得到了一个由很多层堆叠起来的镜像，镜像的大小就等于这些层的总和。

这个过程很耗时，当你需要不断的重复性的构建时，比如本地开发调试时，这就很痛苦了。所以Docker提供了构建缓存来加快构建过程。回到上文中的堆积木的这个比喻，每当有一层积木发生变化，后面的积木层都需要重新搭建。当比如构建上下文下的源文件发生变化比如./libs/db/prisma/schema.prisma发生改动，那么*COPY . /home/node*这个指令会检测到变化，通知下面所有的层都需要重新构建，也就是说Docker会令该层的缓存失效。相反，如果那一层没有变化，那么将会直接使用之前的缓存，这样构建速度就会加快。

![buildFlow.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/buildFlow.png)

分析下上面的Dockerfile的写法，可以知道它不是很有效率。 如果优化了，有几个方向可以试试：



### 1.更好的组织构建顺序

*COPY . /home/node*将会将所有文件到镜像层中，后面紧接着会安装项目依赖yarn install。按照上面所说，当修改了跟依赖管理无关的代码（非package.json和yarn.lock)也会触发该yarn install重新安装所有依赖，即使上次之后依赖并没有发生变化。实际上这里COPY干了两件事情，一个是跟依赖相关的，一个是源代码。两个修改的频率频次也是各不相同，修改项目依赖的频次远远低于修改源代码的频次。所以可以拆成：

```docker
COPY package.json yarn.lock .yarnrc .
RUN yarn install #先安装项目依赖     
COPY . . #复制源代码
RUN apk update       
RUN apk add openssl1.1-compat 
RUN yarn prisma:generate      
ENV NODE_ENV production       
RUN yarn run build-frontend   
```

这里给了一个如何做分拆的角度：频率频次。大多数项目都可以分为：

1. 准备系统， 基础镜像 -- 一次行为
2. 安装系统依赖 -- 一次行为 
3. 安装项目的依赖 -- 频率略高，当你修改了项目的依赖 package.json/requirements.txt等等
4. 修改源代码 -- 频率最高，功能开发
5. 构建 
6. 运行

按照这个顺序来的话，Dockfile可以这么调整：

```docker
# 1.初始基础镜像
FROM node:16-alpine 
USER root           
# 2.安装系统依赖
RUN apk update        
RUN apk add openssl1.1-compat 
# 3.安装项目依赖
WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc /home/node    
RUN yarn install     

# 4.复制源代码，生成项目Prisma
COPY . .
RUN yarn prisma:generate      

# 5. 构建
ENV NODE_ENV production       
RUN yarn run build-frontend   
          
# 6. 运行
EXPOSE 7021         
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]   
```



### 2.减少复制到镜像每一层的文件大小

*COPY . .*这个命令需要谨慎使用，需要思考复制这些文件是要干嘛，为什么而使用。虽然你可以在.dockerignore里声明一些复制时需要忽略的文件，但是有些时候黑名单的方式有点不方便。可以在.dockerignore里声明一些通用性的忽略规则，比如node_modules,.env和NestJS这边的dist目录。显示声明的好处在于迫使你思考你需要这些文件是用来干嘛的，从而避免一些不必要的缓存失效从而影响构建时间和效率。

上面Dockerfile里面的第四步：

```docker
# 4.复制源代码，生成项目Prisma
COPY . .
RUN yarn prisma:generate  
```

这个COPY文件的目的在于为了后面的yarn prisma generate来生成prisma的客户端。从上面关于Prisma工作机制我们知道它只需要有package.json里声明的prisma>schema的值也就是*libs/db/prisma/schema.prisma*文件就足够能完成这个prisma客户端的生成。所以这里如果修改了非*libs/db/prisma/schema.prisma*的源代码比如main.ts等等也会触发这个缓存失效，重新运行yarn prisma generate，这个就不是很有效率。

同时我们知道构建时候我们只需要apps/frontend部分，因为apps/backend和apps/frontend-emp都跟我们此次构建的目的没有关系。同时复制nest build需要的一些配置参数文件和公共组件libs目录，COPY 可以接受多个参数。

```docker
# 4.生成项目Prisma
COPY libs/db/prisma/schema.prisma ./libs/db/prisma/schema.prisma
RUN yarn prisma:generate      

# 5. 构建
COPY apps/frontend ./apps/frontend #复制nestjs下面前端模块源代码
COPY libs ./libs #公共模块libs文件夹
COPY nest-cli.json tsconfig.json libs .  #nest build相关需要的配置
ENV NODE_ENV production       
RUN yarn run build-frontend             
```



### 3. RUN合并命令

在计算是否命中缓存时候， 官方文档[Best practices for writing Dockerfiles: Leverage build cache](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)中提到，Docker对于COPY命令式会读取文件内容做一个checksum校验和，跟镜像层理的文件校验和checksum做对比。但是对于命令行类型的指令RUN而言，它不看命令产生的变化是否相同，而是简单的对比字面上两个命令字符串是否一样。

就RUN指令常见的应用apt-get和apk命令

```docker
# 2.安装系统依赖
RUN apk update        
RUN apk add openssl1.1-compat 
```

这个看起来没什么问题。apk update获取最新的安装源信息，然后apk add安装到最新的版本。当它第一次build的时候，apk update拉取最新的信息，然后安装了openssl1.1-compat的最新版本假设是1.1.0，假设第二次build的时候，夸张点，是十年之后，RUN后面的apk update命令跟之前是一样的，所以Docker不会去拉取最新的安装源，apk add openssl1.1-compat 跟之前也一样，所以不会重新安装，还是沿用之前的1.1.0。 

APK repo:

> openssl1.1-compat=1.1.0
> wget=1.0
> curl=1.0

十年之后需要安装另外一个系统依赖库，比如wget，于是这么写：

```docker
# 2.安装系统依赖
RUN apk update        
RUN apk add openssl1.1-compat wget
```

十年之后的APK repo:

> openssl1.1-compat=1.1.9
> wget=1.9
> curl=1.9


这个时候就有意思了： apk update 这一层不会重新构建，还是因为命令字面上没有变化，*apk add openssl1.1-compat wget*却跟已有镜像层里的*apk add openssl1.1-compat*字符串不一样，于是重新执行安装了最新的版本的wget, 但是openssl1.1-compat的版本是1.1.0, 而wget的版本却是十年前的老版本 :)

所以一般来说会将RUN的指令合并：

```diff
- RUN apk update && apk add openssl1.1-compat
+ RUN apk update && apk add openssl1.1-compat wget
```

这样一来重新构建的时候，Docker知道RUN这个命令有变化，会重新跑一遍，拉取最新的安装源信息，并安装最新版本，这个叫cache busting. 但是紧接着还有一个问题，wget是拉取安装了最新版本了，但是此时openssl1.1-compat如果安装源有更新比如版本到了1.1.9，也会重新安装，此时可能就不是当时的1.1.0, 而这样可能会带来意想不到的问题。

所以最好是在安装时候确定依赖的具体版本version pinning，用`xxx=1.x.x`指定特定的具体的版本，而不是一个大小版本号区间。APK这里可以去[Alpine Linux packages](https://pkgs.alpinelinux.org/packages?name=openssl1.1-compat&branch=edge&repo=&arch=&maintainer=)查询对应的库的版本有哪些，比如 openssl1.1-compat的在构架下版本是**[1.1.1t-r0](https://pkgs.alpinelinux.org/flag/community/openssl1.1-compat/1.1.1t-r0)**，那么Dockfiler可以更新为：

```docker
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add openssl1.1-compat=1.1.1t-r0
```

正如Docker在构建时会使用缓存来提高重复构建的效率一样，系统级别的包管理工具apk/yum/apt-get和后面要提到的NodeJS的包管理工具npm/yarn，也是类似的缓存来提高包安装效率。简单的说，在这里APK在安装时候会将安装包在 /var/cache/apk/目录下进行缓存，当你下一次需要安装某个包的某个版本时候，它会检查缓存中是否已经有了，如果有，那么直接使用，这样就加快了包安装的速度。

在安装过程中，产生了中间产物，也就是缓存，这个需要在结束之后清理的掉：

```docker
RUN  apk update && apk add openssl1.1-compat=1.1.1t-r0 && rm -rf /var/cache/apk/*
```

或者使用*apk add --no-cache  openssl1.1-compat=1.1.1t-r0*来禁止安装过程中使用缓存，这样就不会产生额外的中间产物。

鉴于系统依赖的更新频率不高的特点，对于在不同构建过程中的缓存的使用，甚至是多个不同项目的构建，上面这个其实足够了。但是如果你经常需要改动，类似于下面要提到的项目依赖那么高的频次，那么可以考虑使用BuildKit特性中*RUN --mount type=cache*:

```docker
RUN \
    --mount=type=cache,target=/var/cache/apk \
    apk update && apk add openssl1.1-compat=1.1.1t-r0
```

这样的话/var/cache/apk/目录下内容会在不同的构建之间得到保存，而不是随着构建完成而结束，就好比外挂载了一个专门的数据卷Volume. 当apk需要重装时候，就可以利用apk的缓存/var/cache/apk，减少无谓的网络请求和消耗，提高构建速度。这块也会在后面的yarn/npm里讲到。



**Note： 对于每个Dockerfile指令，需要什么输入，产生什么输出，有什么中间产物， 做什么事情，就跟面向对象里面向接口编程一样，合同contract是什么，必要时需要了解它是怎么工作的**



### 4. npm/yarn安装依赖  

在构建的时候*RUN yarn install*非常慢，而且在整个1.53G的镜像中，它这一层占了1.19G这么大，所以这个肯定是优化的一个大头。Yarn安装时候会将所需的包从npm registry下载下来，缓存到`YARN_CACHE_FOLDER`指定的目录下，比如mac上是*yarn cache dir* = /Users/tuo/Library/Caches/Yarn/v6，这里缓存的信息包括压缩包和元数据（时间戳版本Etag等等）, 然后将压缩包解压到项目下面的node_modules对应的目录下面。

可以想象每次构建都会重复这个流程，解析package.json和yarn.lock, 然后去远程下载包和元数据[Package Metadata](https://github.com/npm/registry/blob/9e368cf6aaca608da5b2c378c0d53f475298b916/docs/responses/package-metadata.md#abbreviated-metadata-format)到缓存目录（在镜像层里），然后安装到node_modules目录下。每次构建都是一次性的，如果有改动，比如新加了一个包，那么这个流程需要重新再来一次，可以想象这个速度肯定是很慢的，这个缓存甚至有点多余，简直是个累赘。还产生了多余中间产物，就是/usr/local/share/.cache/yarn/v6目录下。

```docker
RUN yarn cache dir && yarn install && yarn cache clean
```

虽然改动项目依赖的频次可能没有改源代码的频次那么高，但是实践来看也不小，每次都得这么来一遍就比较折磨人的了。如果可以将这个缓存中间产物从构建镜像的流程中单独拎出来，达到类似数据卷的一样的目的，用的时候挂载上去，用完了卸载下来，这样一来便可以加快构建流程。当新增一个包，其他的包都可以从缓存里读取出来，只需要从远程拉取新增的这个包到缓存并放到对应的node_modules下面即可。官方应该看到了这个常见的需要，提供了新的构建器[BuildKit (docker.com)](https://docs.docker.com/build/buildkit/)，相对老版本的构建器，增加了很多性能方面的优化，不仅仅是我们这里提到的*RUN --mount type=cache*. 

```docker
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install 
```

这里指定了target是/cache/yarn目录，同时设置YARN_CACHE_FOLDER为此目录来设置yarn安装时候缓存的路径。默认新版的Mac版本的Docker Desktop是支持并启用Buildkit的，无需配置；如果是其他系统，需要检查下docker的版本。

```terminal
<missing>      2 minutes ago    RUN /bin/sh -c YARN_CACHE_FOLDER=/cache/yarn…   628MB     buildkit.dockerfile.v0
```

这一步之后，这一层的体积从之前1.19G下降到了628M，还不错。

接下来模拟新加一个包，*yarn add underscore@1.13.6* 然后构建一下：

```terminal
=> [stage-0 5/9] RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install                                                                                                                                                                   114.3s
```

大概是114s 两分钟，这个时长也太长了点吧，不是缓存了所有其他的包，就只需要安装这个understore包么？需要接近2分钟？

这个时候我们需要简单了解下yarn install的原理，默认来说每次安装会根据version,name和integrity去缓存查找是否对应的版本.yarn-metadata.json和.yarn-tarball.tgz;  

* 如果存在，还会发送一个304检查的请求，查看该本地缓存中版本的信息是否过期；如果过期，那么使用新的数据刷新缓存，否则直接使用缓存中的数据；
* 如果不存在，直接从远端拉取数据到缓存

<div id="mermaid-npm">
<div class="mermaid">

flowchart TD
    a0[["yarn install"]]
    a1{"has internet connection?\n是否联网？"}
    a2{"matched in local cache?\n本地缓存是否命中?"}
    a3{"remote check if got expired?\n远程访问校验是否过期?"}
    a4{"fetch \nand update cache \nthen unzip to node_modules\n拉取更新本地缓存\n并解压到node_modules"}    
    a10["use cache\n使用本地缓存"]
    a20["fetch and update cache\n远程拉取并跟新本地缓存"]
    a30["use cache\n使用本地缓存"]
    a0 --> a1-->|YES|a2-->|YES|a3-->|YES|a4
    a1-->|NO|a10
    a2-->|NO|a20
    a3-->|NO|a30
    
</div>
</div>

<br/>

所以这个额外的304检查开销应该就是导致缓慢的原因，特别是你的包越多，那么请求的次数和总的时间就多。但是因为用来yarn.lock来精确锁定版本号，是不是可以跳过这个304请求了？ 

从这两篇文章[NPM v5.0.0 prefer-offline](https://blog.npmjs.org/post/161081169345/v500)和 [PNPM prefer-offline](https://pnpm.io/cli/install#--prefer-offline)的说明来看，`--prefer-offline`可以来设置缓存策略为离线优先，直接匹配缓存中的数据，如果有直接使用，而不用发额外的过期检查请求。这样只有当包在缓存中没有时，才会发生网络请求，这样理论上应该会快很多。尝试安装另外一个版本*yarn add underscore@1.13.2*

```terminal
=> [stage-0 5/9] RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install --prefer-offline                                                                                                                                                   61.7s
```

时间从114.3s降到了61.7s，效果还可以 :)

如果CI/CD构建是完全离线的，你甚至可以使用官方[Running Yarn offline](https://classic.yarnpkg.com/blog/2016/11/24/offline-mirror/)中那样，配置yarn-offline-mirror目录（这个跟yarn cache是不一样的）和yarn-offline-mirror-pruning将依赖包本地生成并提交到代码仓库了，这样在构建时候，可以直接从yarn-offline-mirror目录读取缓存的离线安装包直接安装。


<br/>

### 5. 使用MultiStage多阶段

实际目前打包出来的镜像还是很大，yarn install这块还是占了很多空间。这个时候需要跳出来想想最终输出的产物是什么。Nest build时候会生成dist目录，但是不像其他的语言GoLang等，安装依赖+源代码，编译之后产生一个exe等二进制文件直接丢出去运行即可， 这里还需要node_modules目录，包含第三方的依赖。所以出来的是两个目录，一个是dist，一个node_modules。这里将yarn install 需要安装devDepencies和depencies成为`dev-dep环节`，只需要安装产品发布的depencies传给成为`prod-dep环节`, 那么就有如下关系：

1.  node_moduels/.prisma/client的生成来自prisma generate - 需要dev-dep环节之后, 跟随libs/db/prisma/schema.prisma发生改变
2.  dist目录的生成nest build需要dev-dep环节之后（nest-cli是dev依赖），确切的说第一步之后，因为源代码有引用PrismaClient，跟随源代码发生改变
3.  node_modules最终是第一步生成node_moduels/.prisma/client 加上 prod-dep环节下的node_modules

<div class="mermaid">
flowchart TD    
    A[base] -->|yarn install| B{Dev Dep}
    B --> |prisma generate|H(node_modues/.prisma/client)
    H --> |nest build|I(dist)
    I --> |yarn install --production| J{Prod Dep}    
    J -->|node_modules prod| D[Final output] 
</div>

简单的梳理了分为四个阶段，而且是线性的，每个阶段的产物可以被下一个阶段使用。

```docker
FROM node:16-alpine as dev-dep
USER root           
WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc .
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --prefer-offline

FROM node:16-alpine as prisma-binary
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache openssl1.1-compat=1.1.1t-r0
WORKDIR /home/node 
COPY --from=dev-dep /home/node/node_modules/ ./node_modules/
COPY package.json yarn.lock .yarnrc .
COPY libs/db/prisma/schema.prisma ./libs/db/prisma/schema.prisma
RUN yarn prisma:generate 

FROM node:16-alpine as nest-build
WORKDIR /home/node 
COPY --from=prisma-binary /home/node/node_modules/ ./node_modules/
COPY . . 
RUN yarn run build-frontend   

FROM node:16-alpine  
ENV NODE_ENV production
WORKDIR /home/node 
COPY  --from=prisma-binary /home/node/node_modules/.prisma ./node_modules/.prisma
COPY  --from=nest-build /home/node/dist ./dist
COPY package.json yarn.lock .yarnrc .
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --prefer-offline --production
EXPOSE 7021         
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]   
```

这里利用了[Multi-stage](https://docs.docker.com/build/building/multi-stage/)根据不同的目的来划分为不同的阶段，好处在于当你操作COPY/RUN等命令时不用担心需要清楚中间产物，可能需要一些shell脚本来清除中间产物，保证镜像层不打包无用的文件。一般来说都有完整依赖的开发环境和裁剪瘦身过后的生产环境两个阶段，这里极端的用了四个阶段。得到的最终文件输出去：

> frontend-api   latest    271517ddc574   42 seconds ago      656MB

镜像大小不降反升！

其实是可以优化下阶段组成的，一个原因是都是线性的，另外一个在不同阶段中间进行copy也是比较费时的。于是回到之前的Dockerfile，改成两个阶段：

```docker
# 1.初始基础镜像
FROM node:16-alpine as dev-dep
USER root           
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache openssl1.1-compat=1.1.1t-r0

WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc ./
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --prefer-offline

COPY libs/db/prisma/schema.prisma ./libs/db/prisma/schema.prisma
RUN yarn prisma:generate 
COPY . . 
RUN yarn run build-frontend   

FROM node:16-alpine  
ENV NODE_ENV production
WORKDIR /home/node 
COPY  --from=dev-dep /home/node/node_modules/.prisma ./node_modules/.prisma
COPY  --from=dev-dep /home/node/dist ./dist
COPY  --from=dev-dep package.json yarn.lock .yarnrc ./
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --production --ignore-scripts --prefer-offline
          
# 6. 运行
EXPOSE 7021         
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]   
```

镜像包大小从656MB下降到了567MB。这里有一个问题，当改了源代码之后，yarn install --production就会重新跑一遍，这个是多余的。而且有一个问题就是yarn install --production并不会删除devDependencies的那些依赖，也并没有像npm一样有npm prune来裁剪那个dev依赖，只能是借助于一些自定脚本或者别的方式，[*npm prune* equivalent behavior · Issue #696 · yarnpkg/yarn (github.com)](https://github.com/yarnpkg/yarn/issues/696) 整体而言都不简单。  但是我们可以借助于multistage来绕过这个问题。所以整理下，新的应该是这样的：

* Dev-dep - yarn install , prisma generate, nest build
* prod-dep

最后合起来。

<div class="mermaid">
flowchart TD
    A[base] --> B{yarn install\nprisma generate\nnest build}
    A[base] --> C{yarn install --production}    
    B --> |node_module/.prisma/client, dist|D{npm run start}    
    C --> |node_module|D[npm run start]
</div>

Dockerfile是这样的:

```docker
FROM node:16-alpine as dev-dep
USER root           
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache openssl1.1-compat=1.1.1t-r0

WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc ./
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --prefer-offline

COPY libs/db/prisma/schema.prisma ./libs/db/prisma/schema.prisma
RUN yarn prisma:generate 
COPY apps/frontend ./apps/frontend 
COPY libs ./libs
COPY nest-cli.json tsconfig.json libs .
RUN yarn run build-frontend   

FROM node:16-alpine as prod-dep
WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc ./
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --production --ignore-scripts --prefer-offline

FROM node:16-alpine  
ENV NODE_ENV production
WORKDIR /home/node 
COPY  --from=prod-dep home/node/node_modules/ ./node_modules
COPY  --from=dev-dep /home/node/dist ./dist
COPY  --from=dev-dep /home/node/node_modules/.prisma ./node_modules/.prisma
# need migrations
COPY libs/db/prisma/ ./libs/db/prisma/ 
COPY package.json yarn.lock .yarnrc ./

EXPOSE 7021         
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]   
```

运行一下得到的大小是419MB。

```terminal
7 minutes ago   COPY /home/node/node_modules/.prisma ./node_…   81.7MB    buildkit.dockerfile.v0
7 minutes ago   COPY home/node/node_modules/ ./node_modules …   218MB     buildkit.dockerfile.v0
```

可以看到除了基础镜像外，已经将node_modules优化到了218MB， .prisma/client到了81.7MB.

![dockerHistory.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/dockerHistory.png)

这是我们优化的历史：

![dockerSizeDown.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/dockerSizeDown.png)



### 6. Dockerfile用户权限

默认来说Docker容器是以root用户的运行的， 这个root用户跟宿主机上的root用户是一样的，UID为0。这样一来就意味着如果攻击破解了容器，就可以直接操作宿主机，安全风险很大。既然默认用户是root，那么本着Docker指令能少就少的原则，第一个阶段里的指令`USER root`就可以删掉了。[官方]([Best practices for writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/))建议如果运行非必需ROOT权限，尽量保持权限最小，切换为非root的用户。添加用户群组的时候，显示的指定UID/GID，就像[node-16:apline]([docker-node/Dockerfile at cd7015f45666d2cd6e81f507ee362ca7ada1bfee · nodejs/docker-node (github.com)](https://github.com/nodejs/docker-node/blob/cd7015f45666d2cd6e81f507ee362ca7ada1bfee/18/alpine3.17/Dockerfile))的dockerfile中创建node用户一样：

> FROM alpine:3.17
>
> ENV NODE_VERSION 18.14.2
>
> RUN addgroup -g 1000 node \
>  && adduser -u 1000 -G node -s /bin/sh -D node 

这个时候/home/node目录的权限就是node用户下面。如果你需要切换不同权限的用户，不建议使用sudo，因为其机制问题：一个是会启动2个进程（父子），第二个是信号传递和TTY的问题, 可以考虑使用[tianon/gosu: Simple Go-based setuid+setgid+setgroups+exec (github.com)](https://github.com/tianon/gosu).

要设置运行容器的时候，可以在Entrypoint和cmd之前，设置需要的用户，当然这个用户必须是声明的过的。

```docker
EXPOSE 7021    
USER node     
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]  
```

然后docker build 并运行出现如下报错：

```terminal
@tuo.local ➜ server rvm:(system) git:(uatFt) ✗ docker run 09ba84abb858
$ /home/node/node_modules/.bin/prisma migrate deploy
Error: Can't write to /home/node/node_modules/@prisma/engines please make sure you install "prisma" with the right permissions.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```

貌似是写入node_modules权限不够，因为yarn install是root，但是当运行prisma migrate deploy的用户是node，没有足够的权限写入。

为了验证想法，我们最好可以直接进入容器内部的shell(docker exec -it xxx  /bin/sh)，直接ls查看文件夹的权限，但是此时容器刚启动就因为权限问题退出了。这里可以在最后一步安装bash的库，同时将Entrypoint和CMD改成tail -f让容器一直保持运行。

```docker
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache bash
EXPOSE 7021    
USER node
#ENTRYPOINT [ "npm" ,"run"]    
#CMD ["start:prod_frontend"]  
#dev purpose
ENTRYPOINT ["tail", "-f", "/dev/null"]
```

运行docker exec -it 916c42e68c3b /bin/bash，可以进入shell：

```terminal
916c42e68c3b:~$ ls -al
-rw-r--r--    1 root     root           430 Feb 24 10:40 .yarnrc
drwxr-sr-x    3 root     node          4096 Feb 25 15:19 dist
drwxr-sr-x    3 root     node          4096 Feb 26 03:53 libs
drwxr-sr-x    1 root     node          4096 Feb 25 15:19 node_modules
-rwxr-xr-x    1 root     root          8230 Feb 26 03:13 package.json
-rw-r--r--    1 root     root        376897 Feb 25 14:05 yarn.lock

916c42e68c3b:~$ ls -al node_modules/@prisma/engines
-rw-r--r--    1 root     node           537 Feb 25 12:40 README.md
drwxr-sr-x    2 root     node          4096 Feb 25 15:18 dist
drwxr-sr-x    2 root     node          4096 Feb 25 15:18 download
-rw-r--r--    1 root     node          1384 Feb 25 12:40 package.json
```

node用户对于node_modules/@prisma/engines只有读权限，自然无法写入。这个时候别急着*chmod -R g=rwx ./node_modules/@prisma/engines*，最好的办法是利用dev entrypoint+bin/bash直接登录上去在容器里模拟现实场景运行*yarn prisma migrate deploy*，可以发现是同样的错误。

![prismaEngineMissing.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaEngineMissing.png)

但是问题来了，为什么需要往*node_modules/@prisma/engines*目录下面去写入了，而不是去生成的目录*node_modules/.prisma/client*写入？跟本地一对比可以看到在node_modules/@prisma/engines下面缺失了libquery_engine-linux-musl.so.node这个查询引擎二进制文件。虽然官方文档没仔细写，大概可以推测因为二进制文件是比较大，生成费时费力，而prisma generate或者prisma migrate deploy会跑的次数比较多，所以临时生成的文件夹（带有js，ts和binary target)，需要不断的生成，但是二进制文件基本上系统级别的依赖，不用每次跟着ts/js生成，所以放一份放到了@prisma/engines下面，这样假设.prisma目录删除重新生成时候，只需要从@prisma那里复制下二进制文件即可。所以当prisma检测到@prisma/engines没有二进制文件，就会主动去下载对应的查询引擎二进制文件，导致需要node_modules/@prisma/engines目录下写入。

所以解决办法就是在从devDep构建阶段那边复制.prisma依赖的同时复制@prisma，再一个因为openssl1.1并没有在Alpine里原生支持，所以还需要安装openssl1.1.

```docker
COPY  --from=dev-dep /home/node/node_modules/.prisma ./node_modules/.prisma
COPY  --from=dev-dep /home/node/node_modules/@prisma ./node_modules/@prisma  #同时复制
# need migrations
COPY libs/db/prisma ./libs/db/prisma 
COPY package.json yarn.lock .yarnrc ./  

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache openssl1.1-compat=1.1.1t-r0
EXPOSE 7021    
USER node     
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]  
```

构建之后发现运行没有问题：

```terminal
docker run d61f5e95f91754a3ad8d71cf232a6f09a5a81025aa767b6a8170158bc132165b
yarn -v && printenv && yarn prisma migrate deploy && node dist/apps/frontend/main

$ /home/node/node_modules/.bin/prisma migrate deploy
Prisma schema loaded from libs/db/prisma/schema.prisma
Datasource "db": PostgreSQL database "simeProdFeb21bk1", schema "public" at "host.docker.internal:5432"

263 migrations found in prisma/migrations

No pending migrations to apply.
Done in 1.88s.
[Nest] 17   - 02/26/2023, 4:49:59 AM   [NestFactory] Starting Nest application...
```


这个方法是提前将二进制文件下载生成好打包到镜像中，好处是启动时候yarn prisma migrate deploy无法网络请求查询引擎二进制文件，坏处是生成的镜像包体积会变大640MB（相比之前420MB）。也就说明这个二进制文件其实还是挺大的，特别是两个地方@prisma和.prisma都有独立的文件，不是软链接。这个其实也有办法可以优化二进制文件的大小（后面会谈到），因为有两处使用，优化好应该可以节省不少空间。

还有一种是不复制@prisma和.prisma到镜像中，利用yarn prisma migrate deploy会自动检查拉取二进制文件带@prisma/engine并生成对应的.prisma/client目录.

```diff
- COPY  --from=dev-dep /home/node/node_modules/.prisma ./node_modules/.prisma #没有必要 
- COPY  --from=dev-dep /home/node/node_modules/@prisma ./node_modules/@prisma #没有必要
+ RUN chmod -R g=rwx ./node_modules/@prisma/engines #开放此文件夹权限，因为yarn install是root,node用户只能读
+ ENV PRISMA_BINARIES_MIRROR http://prisma-builds.s3-eu-west-1.amazonaws.com #国内这个速度还行，不然有的你等
```

这样的好处是打包镜像体积很小，440MB左右。但是缺点是容器启动时候需要： 1.下载二进制文件，2：运行prisma generate生成客户端。这两件事会影响容器启动的时间，可以的话可以考虑自己架个内部镜像。



### 其他改善

还有一些其他的改进的建议：

* 尽量使用最新的基础镜像 - 不管从性能还是安全性角度来看

* 缩减每一层的打包的大小；比如yarn install这里，可以考虑使用包管理辅助工具比如[depcheck - npm (npmjs.com)](https://www.npmjs.com/package/depcheck)来扫描代码中没有使用到的包，从而将其剔除出去来减少node_modules的大小

* 尽可能的将项目依赖的版本保持最新。可以使用一些工具[npm-check-updates - npm (npmjs.com)](https://www.npmjs.com/package/npm-check-updates)来检查是否有版本的更新，比如这里就有提示 *prisma                              ^3.1.1  →    ^4.10.1*。实际上在prisma后来发布的[版本](https://github.com/prisma/prisma/releases)里，他们已经优化了OpenSSL的支持，同时大幅度缩小了二进制文件的大小。

  [Release 4.10.0 · prisma/prisma (github.com)](https://github.com/prisma/prisma/releases/tag/4.10.0)

  > Smaller engine size used in Prisma CLI
  >
  > In 4.8.0, we decreased the size of the engines by ~50%, which significantly impacted Prisma Client, especially in serverless environments.
  >
  > In this release, we've reduced the size of Prisma CLI by removing the Introspection and Formatter engines. The introspection functionality is now served by the Migration Engine. A cross-platform Wasm module has entirely replaced the Formatter Engine. This reduces the overall installation size for Prisma CLI.

  在4.8.0版本里将查询引擎的大小缩小了50%，更符合了轻量化上云的要求。

经过这些优化，将最终镜像的大小缩小到了360M!

![finalDockerSize.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/finalDockerSize.png)

看看每一层的大小，主要是看prisma和node_modules:

![finalDockerLayersSize.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/finalDockerLayersSize.png)

  
## 最终Dockerfile


```docker
FROM node:16-alpine as base
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache openssl=1.1.1t-r1 

FROM base as dev-dep
WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc ./
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --frozen-lockfile  --prefer-offline

COPY libs/db/prisma/schema.prisma ./libs/db/prisma/schema.prisma
RUN yarn prisma:generate 
COPY apps/frontend ./apps/frontend 
COPY libs ./libs
COPY nest-cli.json tsconfig.json libs .
RUN yarn run build-frontend   

FROM node:16-alpine as prod-dep
WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc ./
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --frozen-lockfile  --production --ignore-scripts --prefer-offline

FROM base
ENV NODE_ENV production
WORKDIR /home/node 
COPY  --from=prod-dep home/node/node_modules/ ./node_modules
COPY  --from=dev-dep /home/node/dist ./dist
COPY  --from=dev-dep /home/node/node_modules/.prisma ./node_modules/.prisma
COPY  --from=dev-dep /home/node/node_modules/@prisma ./node_modules/@prisma
# need migrations
COPY libs/db/prisma ./libs/db/prisma 
COPY package.json yarn.lock .yarnrc ./  

EXPOSE 7021    
USER node     
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]  

#dev purpose
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache bash
# ENTRYPOINT ["tail", "-f", "/dev/null"]
```

## 引用

  * [Best practices for writing Dockerfiles: Leverage build cache](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
  * [Optimizing builds with cache management (docker.com)](https://docs.docker.com/build/cache/)
  * [Multi-stage builds (docker.com)](https://docs.docker.com/build/building/multi-stage/)
  * [BuildKit (docker.com)](https://docs.docker.com/build/buildkit/)
  * [Top 20 Dockerfile best practices for security – Sysdig](https://sysdig.com/blog/dockerfile-best-practices/)
  * [Prisma \| Next-generation ORM for Node.js \& TypeScript](https://www.prisma.io/)
  * [为什么你应该在docker 中使用gosu？ - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/151915585)
  * [npm install中的缓存和资源拉取机制_照物华的博客-CSDN博客](https://blog.csdn.net/daihaoxin/article/details/105749014)
  * [Permissions error - after declaring USER and WORKDIR · Issue #740 · nodejs/docker-node (github.com)](https://github.com/nodejs/docker-node/issues/740)

   

  