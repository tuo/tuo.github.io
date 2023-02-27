---
layout: post
title: "NestJS+Prisma Dockerfile build optimization"
date: 2022-06-12 12:55:32 +0800
published: true
tags: nestjs,prisma,docker,dockerfile
---

Recently, a NodeJS project has been developed by using web framework [NestJS 7.0](https://nestjs.com/) and ORM [Prisma 3.1.1](https://www.prisma.io/) for the backend. The reason to choose those two tech as stack at that time seems quite oblivious: both support Typescript natively and allow for isomorphic development with React in the frontend. The backend has been divided into three modules roughly based on the platform to which its API is served: backend, frontend and frontend-emp. Apart from that, there are some shared libs, e.g. prisma schema defition , migration scripts and uitls. The structure of the codecase looks like following:

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

The database schema definitions are in the libs/db/prisma/schema.prisma, and the migrations are located under libs/db/prisma/migrations. A quick look a the DSL schema syntax:

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
    id        Int       @id @default(autoincrement()) //
    uid       String?   @default(uuid()) @db.Uuid // uid to reset password
    name      String // name
    ...
}
```

The connection string is got from the environment variable DATABASE_URL that got passed in. Every time your modify the schema.prisma, you need to run *prisma migrate dev* to let prisma client to check with existing database schema and generate migration sqls. After that, run *prisma generate* to generate a typescript-based prisma client for source code to use.

 数据库的连接串是从环境变量DATABASE_URL拿到. 每次修改schema.prisma，都需要运行prisma migrate dev生成迁移脚本，同时运行prisma generate可以生成基于TS的客户端@prisma/client来直接使用。

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB*
await this.prisma.user.findMany({...})
```

![prismaGenerate](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaGenerate.png)
<cite> Prisma Concept [Generating the client](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)</cite>

## Add Prisma to Dockerfile

Now we need write the Dockerfile to generate docker images, push to the dockerhub and deploy that into the kubernets cluster. The process is done on the CI/CD platform(Jenkins)to make it fully automated. The build block is the Dockerfile. Here is the starting snippets:

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

No fancy stuff. The first instruction is choose right base image to start with: NodeJS v16 based on lightweight Linux Apline distribution. [Dockerhub docker-node](https://hub.docker.com/_/node) shows all the versions and distributions, and it is always helpful to click those links to jump to its Dockerfine definition on the github to get an idea of how its instructions are written. The followiing instructions are just: copying the source code, yarn install to install dependencies, prisma generate to generate @prisma/client, nest build to build artifacts (dist folder here). Last not the least, the command to run this whole nodejs app: *node dist/apps/frontend/main.js*.


第一条指令是选定了合适的基础镜像包： 基于Alpine Linux轻量级操作系统镜像上NodeJS v16版本。这块可以看看https://hub.docker.com/_/node，几乎每个版本都有默认，bullseye和alpine等等版本，对应的每个镜像包含的功能和大小也是不一样的，可以进一步到github查看其原始的Dockfile定义. 后续的指令就是将本地源文件都复制到镜像中，并运行yarn install安装依赖，prisma generate生成@prisma/client， nest build生成dist， 最后*"node", "dist/apps/frontend/main.js*运行整个程序。

### Prisma Generate

​   when you run command *docker build -t frontend-api  -f ./Dockerfile.frontend .* to build image, you would notice an error got thrown at the line -  *RUN yarn prisma generate* : 

​   when you run command *docker build -t frontend-api  -f ./Dockerfile.frontend .*来构建这个镜像时候，会在*RUN yarn prisma generate*报如下错误：

 
![prismaGenerateErr.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaGenerateErr.png)

```terminal
#9 3.978 Prisma schema loaded from libs/db/prisma/schema.prisma  
#9 4.849 Error: Unable to require(*/home/node/node_modules/prisma/libquery_engine-linux-musl.so.node*)
#9 4.849  Error loading shared library libssl.so.1.1: No such file or directory (needed by /home/node/node_modules/prisma/libquery_engine-linux-musl.so.node)
```
From the stacktrace, it looks like there are two points worthing noting:
    
    *  couldn't load this shared lib: `libssl.so.1.1` 
    *  this lib is referenced by `node_modules/prisma/libquery_engine-linux-musl.so.node`

The libssl.so.1.1, from its name, we could guess it is related to SSL, particulary on the linux, OpenSSL. It is dynamically linked at run time by libquery_engine-linux-musl.so.node. A quick search, some github issues on OpenSSL github repo [Openssl can't find libssl.so.1.1 and libcrypto.so.1.1 · Issue #19497 · openssl/openssl (github.com)](https://github.com/openssl/openssl/issues/19497) and Prisma github repo [Support OpenSSL 3.0 for Alpine Linux · Issue #16553 · prisma/prisma (github.com)](https://github.com/prisma/prisma/issues/16553) , we are sure it is likely that the operating system we run doesn't include OpenSSL dependency or we got the openssl but its verision doesn't satify. To double check, we could check the base image of our dockerfile - node:16-alpine - [docker-node/16/alpine3.15/Dockerfile](https://github.com/nodejs/docker-node/blob/3760675a3f78207605d579f366facbb0d9f26de5/16/alpine3.15/Dockerfile):


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
...  
```

Previously we know we want a 16 version of NodeJS that running on Liunx Apline, but we don't know exactly what specfic that versions are for NodeJS and Alpine. Here throught the Dockerfile, we have got the answers: NodeJS 16.13.1 and Alpine 3.15. The following part of that Dockerfile is just installing basic development dependencies, Node and yarn. There isn't any instructions to install OpenSSL library. We have pinpointed the problem.

The solution to this is easy, just install OpenSSL 1.1 version before the instruction *prisma generate*. Just use the APK intaller to install that:



这里可以看到具体node-16:alpine是基于哪个NodeJS的版本和哪个Linux Alpine的发布: 16.13.1和3.15，后续当docker run起来之后可以*cat /etc/os-release*进一步确认。下面接着安装NodeJS和基础的开发依赖，里面是没有openssl这个库的。这个问题就变成了如何在prisma generate之前安装这个openssl1.1这个组件， 这就很简单了，使用APK安装即可：

```docker
FROM node:16-alpine 
WORKDIR /home/node
COPY . /home/node

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories #change source repo to AliCloud mirror, only needed in China
RUN apk update  # updating of the indexes from remote package repositories
RUN apk add openssl1.1-compat # install openssl 1.1
```

Rrerun the docker build, now it works!
重新docker build一下，构建成功！

### Prisma Generate - How it works

Even though the problem seems got solved, there remains one mistery to me: Prisma possibly need OpenSSL to support SSL connection with database, then what does *node_modules/prisma/libquery_engine-linux-musl.so.node* (some shared object with Node?) this file to do with *prisma generate* and what does it do ?

It turns out that the prisma documentation has a section dedicated on this: [Generating the client (Concepts) (prisma.io)](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client). Basically you run `*prisma generate*, prisma client(yarn add @prisma/client) will generate a *PrismaClient* with three components:

  * typescript definitions(index.d.ts)
  * Javascripts code(index.js) 
  * a query engine(libquery_engine-xxx.xx.node) under path *node_modules/.prisma/client*.

![prismaBinaryTarget.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaBinaryTarget.png)

Recall that you need first `yarn add @prisma/client` package. That @prisma/client consists of two key parts:

    * The @prisma/client module itself, which only changes when you re-install the package:  *node_modules/@prisma/client*
    * The .prisma/client folder, temporary, which is the default location for the unique Prisma Client generated from your schema: *node_modules/.prisma/client*

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB*
await this.prisma.user.findMany({...})
```

When in the source code, we include the PrismaClient and call *this.prisma.user.findMany*, the prisma client will send this command to query engine. Then the query engine will translate to the sql queries and send it forward to the database; Once database has the query result, it will send back to query engine, which translates those raw data to plain javascript objects and sends to the prisam client.

![prismaQueryEngine](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaQueryEngine.png)
<cite> Prisma Concept [Generating the client](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)</cite>

> Prisma Client uses a query engine to run queries against the database. This query engine is downloaded when prisma generate is invoked and stored in the output path together with the generated Client.

The query engine is compiled and built on different platform to get a better performance. 

> It is named query-engine-PLATFORM or libquery_engine-PLATFORM where PLATFORM corresponds to the name of a compile target. Query engine file extensions depend on the platform as well. As an example, if the query engine must run on a Darwin operating system such as macOS Intel, it is called libquery_engine-darwin.dylib.node or query-engine-darwin

It does match the name on my macOS Intel. But how about the name on Linux Alpine 3.15 docker image? We could find it out in [Prisma schema API (Reference)](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options):

![prismaEngineAlpine.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaEngineAlpine.png)

PLATFROM name is *linux-musl*, and it requires OpenSSL 1.1.x installed, so the full name would be *libquery_engine-linux-musl.so.node* - exactly the name that shows up in the error trace. But after Primsa 4.8.0, prisma has given better support for OpenSSL 3.0:  [Support OpenSSL 3.0 for Alpine Linu](https://github.com/prisma/prisma/issues/16553#top).

> install OpenSSL 1.1 -> download query engine for platform specific -> prisma generate

### How to run Prisma Migrate Deploy

How to run migration sqls on production environment? First you need have *libs/db/prisma/migration* folder exist. [Deploying database changes with Prisma Migrate](https://www.prisma.io/docs/guides/deployment/deploy-database-changes-with-prisma-migrate) doesn't recommend you run from locally directly against production database. Instead run *prisma migrate deploy* during the release phase. And it need access @prisma/client dependence, so just move it from *devDependencies* to the production phase *dependencies* section in your package.json.

```diff
- CMD ["node", "dist/apps/frontend/main.js"]  
+ ENTRYPOINT [ "npm" ,"run"]
+ CMD ["start:prod_frontend"]  
```

in your package.json, add following:

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


## Dockerfile optimization

In previous step, we have integrated Prisma to the Dockerfile and are able to run it. But the docker image that final build out is quite big, 1.53G and the build time is quite slow, which is not idea for CI/CD pipepline.

上一步将Prisma成功的集成到了Dockfile里，并且部署之后容器成功的跑了起来，看起来流程没有问题。但是这个打包的镜像非常大，有1.3G，并且构建时间非常长，这相当不利于CI/CD的快速迭代演化。

```terminal
server ➤ docker images                                                                                                                                                                                                                                              REPOSITORY     TAG       IMAGE ID       CREATED             SIZE
frontend-api   latest    93727cf78c85   About an hour ago   1.53GB
```
Before diving into the optimization, let's take a look at how Docker build image based on the Dockerfile.
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

The process is like Jenga game, putting layer on top of another layer like stack. *From node:16-alpine* is layer n, *COPY . /home/node* is layer n+1， which comes after the layer n. Each instruction corresponds to a layer, and finally the docker images is just a bunch of layers stacked togher. The most common used instruction is *COPY* and *RUN*.
COPY deals with files related operations, like copy files from current directory of the build context to the layer in docker image; RUN is used for executing shell comands or scripts.

The whole proces takes a quite amount time when first build. But second time, it will go much faster as Docker provide a cache for repetive work to speed up build process. And how the cache works? It simply remember whether or no you made change to this current layer. If any change detected in layers, itself and following layers will get a rebuild. It is like you pull a block from Jenga, except in Docker build, all blocks will get rebuild on top of where that block got pulled.

Clearly in above Dockerfile, if you modified *./libs/db/prisma/schema.prisma* file to, e.g. add a new table or table field, which says *Layer n+3* - *COPY . /home/node* has made some change since ./libs/db/prisma/schema.prisma is under current build context directory, Docker is smart enough to spot that change and trigger a rerun of that instruction and all instructions below - invalidate the build cache.


![buildFlow.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/buildFlow.png)

You may wondering that I only changed schema.prisma, it should just trigger prisma to regenerate its client and rebuild the nest project and nothing more. But it is also trigger yarn install which I didn't even touch. Yeah, that Dockerfile is not very efficient. There are a couple of ways to improve it:


### 1.Order your layers

Yeah, any change on source code, not package.json or yarn.lock will trigger Docker to reinstall all packages for project. Acutally the *COPY . /home/node* happens to do two things at one time: 1. copy project dependencies, 2. copy source code. Those two not only comes with differnet responseibility , but also comes with different change frequency.
The time you modify your porject dependenci is significatntly less that the tiome you modify souce code. So the Dockerfile could change to :

```docker
COPY package.json yarn.lock .yarnrc .
RUN yarn install #install project  packages 
COPY . . # copy source codes
RUN apk update       
RUN apk add openssl1.1-compat 
RUN yarn prisma:generate      
ENV NODE_ENV production       
RUN yarn run build-frontend   
```

Different modify frequences sginals that possible diffrent modules. Most project's Dockerfile could be breakdown roughly to following stages:

1. prepare the operating system, base image - one time only
2. install system level libraries - most of time, one time only 
3. install project dependecies -  sometimes, you might add/remove/update your packages
4. modify your source code in codebase - daily, most often
5. build 
6. run - trivail

With this order in place, we could change the Dockerfile to:

```docker
# 1.base image OS
FROM node:16-alpine 
USER root           
# 2.install system level libs
RUN apk update        
RUN apk add openssl1.1-compat 
# 3. install packages
WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc /home/node    
RUN yarn install     

# 4.copy source code, generate prisma client
COPY . .
RUN yarn prisma:generate      

# 5. build
ENV NODE_ENV production       
RUN yarn run build-frontend   
          
# 6. run
EXPOSE 7021         
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]   
```

### 2.Keep layers small

Generally the instruction *COPY . .* indicates there is some bad smell there. Even though you put files you dont' want include in .dockerignore to tell Docker to skip certain files, like common files or directories *node_modules* and build artificats folder *dist*, it is recommended that you explicitly write down what files you want to include in instruction. To explicitly naming what you want to include helps you to think what you're gonna use it for, typically copy files is just first step, it is usally used as an input for following steps.

```docker
# 4.copy source code, generate prisma client
COPY . .
RUN yarn prisma:generate  
```
The step who takes input is *RUN yarn prisma:generate*, what does it do? it takes a package.json and look up where the *schema.prisma* is located. Once it find the path to schema.prisma, aka *libs/db/prisma/schema.prisma*, it loads that file and then use @prisma/client package to generate prisma client files. So this instructions takes two files: 
package.json and libs/db/prisma/schema.prisma. Therefore the input of this instruction, just need copy those two files, not the whole code base.

    * command: yarn prisma generate
    * input:   package.json and libs/db/prisma/schema.prisma
    * output:  node_modues/.prisma/client

The same idea applies to the *RUN yarn run build-frontend* instruction, which runs *nest build frontend* to build frontend related source code to dist folder. So source codes doesn't need include apps/backend and apps/frontend-emp, just need frontend and shared libs, alone with package.json and nest-cli.json.

    * command: yarn run build-frontend
    * input:   apps/frontend, libs, package.json and nest-cli.json
    * output:  dist

```docker
# 4. prisma generate 
COPY libs/db/prisma/schema.prisma ./libs/db/prisma/schema.prisma
RUN yarn prisma:generate      

# 5. build
COPY apps/frontend ./apps/frontend 
COPY libs ./libs 
COPY nest-cli.json tsconfig.json libs . 
ENV NODE_ENV production       
RUN yarn run build-frontend 
```

### 3. RUN: Combine commands together wherever possible

When Docker build try to decide whether layer need rebuild or not, it will check with cache. If cache was hit, then no need to rebuild this layer, if not hit, it will run the instructions and rebuild the current layer and following layers. How does the cache work? How does this calculate process work ? [Best practices for writing Dockerfiles: Leverage build cache](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/) mentioned that Docker will do a file read and calculate its content checksum and compare with the one the exsting image for the COPY insturction, and a command string literal equal check for the RUN instruction. Let's take a look the common command apk/apt-get for RUN instructions:

```docker
RUN apk update        
RUN apk add openssl1.1-compat 
```

Initially the instructions seems okay. *apk update* will fetch initially indexs(e.g name, versions, etag) of packages in remote repositories. *apk add openssl1.1-compat* then will get installed with latest version from indexes. 

Suppose at this time, libs versions in apk repos are:

> openssl1.1-compat=1.0
> wget=1.0
> curl=1.0

The current latest versions of* openssl1.1-compat* is *1.0* and it will get installed. Then the whole thing got forgotten for ten years and it need add another library: *wget*.

```docker
RUN apk update        
RUN apk add openssl1.1-compat wget
```

Ten years after, the apk repos is like: 

> openssl1.1-compat=1.9
> wget=1.9
> curl=1.9


To your surpise, the versions in final docker image got built is: openssl1.1-compat (1.0 old) and wget (1.0 old too). What happens here is that docker saw `("RUN apk update") in dockerfile == ("RUN apk update") in docker image` - two command strings equals! Then it will pick up the cache and skip actually rebuild this layer , etc run apk update to actuall y update local indexes from remote repo. It ends up with old packages info in the local. The next insturction `("RUN apk add openssl1.1-compat wget") in dockerfiler != ("RUN apk add openssl1.1-compat") in docker image`, then cache is invlidated and this layer need rebuild hence run apk install with wget version 1.0.

So if it is just command string literal compare, we could just merge those into one command:

```diff
- RUN apk update && apk add openssl1.1-compat
+ RUN apk update && apk add openssl1.1-compat wget
```

Now docker sees *apk update && apk add openssl1.1-compat* != *apk update && apk add openssl1.1-compat wget*, it will invlaidate the cache and rebuild the layer , which is ccalled *cache busting*. Now apk update will fetch latest indexes and apk install will install the latest version. The version of wget will be  1.9, however the version of openssl1.1-compat is 1.9 too. This bump from 1.0 -> 1.9 might accidently break our code and cause some surpises.

Rule of thumb is to lock down the version info for packages. This is called version pinning, you could search what versions that packages has for that archetcture. FOr example, for apk, you could go to [Alpine Linux packages](https://pkgs.alpinelinux.org/packages?name=openssl1.1-compat&branch=edge&repo=&arch=&maintainer=) or *apk search* to look up version informations. For openssl1.1-compat, its version we picked is *[1.1.1t-r0](https://pkgs.alpinelinux.org/flag/community/openssl1.1-compat/1.1.1t-r0)*.  

```docker
RUN apk update && apk add openssl1.1-compat=1.1.1t-r0 wget=1.9
```

That's better. let's examine this command:

    * command: apk update && apk add openssl1.1-compat=1.1.1t-r0 wget=1.9
    * input:   none
    * output:  openssl1.1-compat lib and wget lib, plus cache under /var/cache/apk/

It has some byproducts from the typical package management tools - the cache. We also need cleanup that as it is not necessary.

```docker
RUN  apk update && apk add openssl1.1-compat=1.1.1t-r0 && rm -rf /var/cache/apk/*
```

or add *--no-cache* flag to apk install:

```docker
RUN  apk update && apk add --no-cache openssl1.1-compat=1.1.1t-r0 
```

Given the installion of systme libraraires are pretty much one-off, you rarelly borther to use cache between build to reuse it. However if you really want to cache between builds to speed up installtion proces, you could try leverage docker builder's new build feature *BuildKit*:

```docker
RUN \
    --mount=type=cache,target=/var/cache/apk \
    apk update && apk add openssl1.1-compat=1.1.1t-r0
```

It is like mounting a dedicated volume for that, so the cache will be preserverd bewteen builds. This will be elaborated in following yarn/npm section.


### 4. NPM/Yarn install packages  

when Docker build layer on *RUN yarn install*, it is quite slow and takes quite big size *1.19G* out of *1.53G* total final docker image size. Just like apk add system level packages, yarn install also will leverage cache.

    * command: yarn install
    * input:   package.json yarn.lock .yarnrc
    * output:  node_modules, plus cache 

Put it simply, when *yarn install* happens, it will fetch package's compressed file and a [metadata](https://github.com/npm/registry/blob/9e368cf6aaca608da5b2c378c0d53f475298b916/docs/responses/package-metadata.md#abbreviated-metadata-format)(name,version,modified time etc) file from *npm registry*, then save those to local directory that environment variable `YARN_CACHE_FOLDER` points to, finally decompress it to node_modules folder.

```docker
RUN yarn cache dir && yarn install && yarn cache clean
```
The output is clean now but there is problem with this. If you need add/update/delete package in package.json and update its yarn.lock file, everytime you build the docker image, it will fetch from remote, save to cache folder and move to node_modules folder for all packages even if you just add one new package for exmaple. With the help of proper ordering the layer and relatively low frequency of changing project dependencies, this alredy got mitigated a lot.

But there are possible chances that you need update packages, to make it even worse, like moments for some critical bug fixes for live running applications,  this would put lots of congnitive load on you. It is helpful that we could dig more into ti and figure out why and how it could be improved.

* ##### BuildKit

First you could lverage the [BuildKit](https://docs.docker.com/build/buildkit/),the new docker builder, to act like a mounted volume for caches between builds. Buildkit not only tracks content mounted for specific operations, but also it could do like parellelize builiding indepdent build stages in [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/). Here we're gonna use *RUN --mount type=cache* to mount to yarn install operation:


```docker
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install 
```

Set mount type to cache and target to some directory, then overwrite yarn cache folder with that directory by setting *YARN_CACHE_FOLDER* enviroment evariable for yarn install.My Docker Desktop on mac is 4.16.2 (95914), which has built-in support for Buildkit and default it is on. You better check which docker version you install and maybe need explicit configure it to enable Buildkit.

```terminal
<missing>      2 minutes ago    RUN /bin/sh -c YARN_CACHE_FOLDER=/cache/yarn…   628MB     buildkit.dockerfile.v0
```
This way the cache - yarn install byproduct - will not be included in output thus get to layer in docker image. We dont' need to clean the cache after yarn install. The result is the a hugh drop in terms of docker image size: from 1.19G to 628M. Not bad at all!

* ##### yarn install --perfer-offline


Le't try add brand new package, *yarn add underscore@1.13.6*, then build:

```terminal
=> [stage-0 5/9] RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install                                                                                                                                                                   114.3s
```

roughly 114 seconds, like 2 minutes. Only add this new package *understore*, the time is kinda too long for this.

It is time to take a look at how *yarn install* works. By default, everytime it run yarn install, it will use the version,name and integrity to check any matched one in local cache. 

* if match, it will send 304 request to check if the one in local cache is stale or not; if stale, then download new package info, otherwise just use the one in local cache
* if no match, fetch latest data from remote to local cache

<div id="mermaid-npm">
<div class="mermaid">

flowchart TD
    a0[["yarn install"]]
    a1{"has internet connection?\n是否联网？"}
    a2{"matched in local cache?\n本地缓存是否命中?"}
    a3{"remote check if stale?\n远程访问校验是否过期?"}
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
Those extra 304 requests should be the culprits. The more packages you have, the longer it would take. Is there any way to adjust the fetch behavior? 

From this npm blog [NPM v5.0.0](https://blog.npmjs.org/post/161081169345/v500) and [PNPM](https://pnpm.io/cli/install#--prefer-offline), there is one option there for yarn install - `--prefer-offline` - which will make npm skip any conditional requests (304 checks) for stale cache data, and only hit the network if something is missing from the cache.

```terminal
=> [stage-0 5/9] RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install --prefer-offline                                                                                                                                                   61.7s
```

The time has been shrinked from 114.3s to 61.7s :) 

If you want to go completely offline, you could use the methods in the blog [Running Yarn offline](https://classic.yarnpkg.com/blog/2016/11/24/offline-mirror/) to configure *yarn-offline-mirror* and *yarn-offline-mirror-pruning* to pack the dependecies to zip/tarball and upload to souce control. When you build docker image, yarn could directly load packages from offline mirror folder and move to node_modules folder.

<br/>

### 5. Use multi-stage builds


Let's recall the steps we breakdown in previous step:

> 1. prepare the operating system, base image - one time only
2. install system level libraries - most of time, one time only 
3. install project dependecies -  sometimes, you might add/remove/update your packages
4. modify your source code in codebase - daily, most often
5. build 
6. run - trivail

If we put all those together, we need remember the input and output. THe output could have some unexpected byproduct that probably involves some custom cleanup shell scripts. Just think about the final image, the running part, if it is golang, it only just need a binary executeable to run - it is that simple. Here in NestJS project, it requires more files - three parts: dist folder, node_modules folder and package.json file. Ideally you just need those three layers for each one - as to how it got gnereated, mind your busniess. Like Object oreiente programmming, coudl wejust encapsutlate the implemtation details and have a clear interace like high-level abstraction to express how we  breakdown the above process? Any concret implmeation details like intermidated byproduct is not my concern and hsouldn't be!

> [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/) allow you to drastically reduce the size of your final image, without struggling to reduce the number of intermediate layers and files.

Multi-stage builds is what we want here. Now we have a naive sequence of stages:

    devDependecies(yarn install) ->  .prisma/client(prisma gnerate) ->  dist (nest-build) -> prodDependecies(yarn install --production)
    
<div class="mermaid">
flowchart TD    
    A[base] -->|yarn install| B{Dev Dep}
    B --> |prisma generate|H(node_modues/.prisma/client)
    H --> |nest build|I(dist)
    I --> |yarn install --production| J{Prod Dep}    
    J -->|node_modules prod| D[Final output] 
</div>


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

COPY libs/db/prisma/ ./libs/db/prisma/  # need prisma migrations
COPY package.json yarn.lock .yarnrc ./  # yarn prisma:migrate

EXPOSE 7021         
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]  
```

The final stage is one where its layer will get to the final docker image. *COPY  --from=prisma-binary* to explictly copy output of from stage to current stage and the fromStage is ephermeral - all those intermidate will not bring to referring stage. That way it would create minimal layers in the final docker image hence reduce the docker image size.

You may wondering why we need have separate stage for *prod-dep* to yarn install production dependencies again, why not just copy the all dependeices from *dev-dep*, then run *npm prune* to prune out any development dependecies. The reason is that [*npm prune* equivalent behavior · Issue #696 · yarnpkg/yarn (github.com)](https://github.com/yarnpkg/yarn/issues/696) there isn't any good way to do that in yarn :( 

The docker image's size has drop to 420MB. node_modules folder is 218MB and .prisma/client is 81.7MB

```terminal
7 minutes ago   COPY /home/node/node_modules/.prisma ./node_…   81.7MB    buildkit.dockerfile.v0
7 minutes ago   COPY home/node/node_modules/ ./node_modules …   218MB     buildkit.dockerfile.v0
```

![dockerHistory.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/dockerHistory.png)

History of size changes of docker image:

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

  
## 最终Dockerfile


```docker
FROM node:16-alpine as base
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache openssl1.1-compat=1.1.1t-r0

FROM base as dev-dep
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

  * [Optimizing builds with cache management (docker.com)](https://docs.docker.com/build/cache/)
  * [Multi-stage builds (docker.com)](https://docs.docker.com/build/building/multi-stage/)
  * [BuildKit (docker.com)](https://docs.docker.com/build/buildkit/)
  * [Top 20 Dockerfile best practices for security – Sysdig](https://sysdig.com/blog/dockerfile-best-practices/)
  * [Prisma \| Next-generation ORM for Node.js \& TypeScript](https://www.prisma.io/)
  * [为什么你应该在docker 中使用gosu？ - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/151915585)
  * [npm install中的缓存和资源拉取机制_照物华的博客-CSDN博客](https://blog.csdn.net/daihaoxin/article/details/105749014)
  * [Permissions error - after declaring USER and WORKDIR · Issue #740 · nodejs/docker-node (github.com)](https://github.com/nodejs/docker-node/issues/740)

   

  