---
layout: post
title: "NestJS+Prisma Dockerfile build optimization"
date: 2022-06-12 12:55:32 +0800
published: true
tags: nestjs,prisma,docker,dockerfile
---

Recently, There was a NodeJS project developed by using web framework [NestJS 7.0](https://nestjs.com/) and ORM [Prisma 3.1.1](https://www.prisma.io/) for the backend. The reason to choose those two tech as stack at that time seems quite oblivious: both support Typescript natively and allow for isomorphic development with React in the frontend. The backend has been divided into three modules roughly based on the platform to which its API is served: backend, frontend and frontend-emp. Apart from that, there are some shared libs, e.g. prisma schema defition , migration scripts and uitls. The structure of the codecase looks like following:

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

The connection string is obtained from the environment variable DATABASE_URL that was passed in. Every time your modify the schema.prisma, you need to run *prisma migrate dev* to let prisma client to check existing database schema and generate migration SQLs. After that, run *prisma generate* to generate a Typescript-based prisma client for your source code to use.

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB*
await this.prisma.user.findMany({...})
```

![prismaGenerate](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaGenerate.png)
<cite> Prisma Concept [Generating the client](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)</cite>

## Add Prisma to Dockerfile

Now we need to write the Dockerfile to generate Docker images, push them to Dockerhub, and deploy them into the Kubernets cluster. The process is done on the CI/CD platform(Jenkins) to make it fully automated. The cornerstone is the Dockerfile, and here is the initial code snippet:

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

No fancy stuff here. The first instruction is choose right base image to start with: NodeJS v16 based on the lightweight Linux Apline distribution. [Dockerhub docker-node](https://hub.docker.com/_/node) shows all the available versions and distributions, and it's always helpful to click on those links to jump to their Dockerfine definitions on Github to get an idea of how their instructions are written. The following instructions are simple: copy the source code, run "yarn install" to install dependencies, run "prisma generate" to generate "@prisma/client", run "nest build" to build the artifacts (which will be in the "dist" folder),  and last but not least, run the command to start the whole NodeJS app: *node dist/apps/frontend/main.js*.
 

### Prisma Generate

​   When you run the command *docker build -t frontend-api  -f ./Dockerfile.frontend .* to build the image, you may notice an error being thrown at the line -  *RUN yarn prisma generate* : 

![prismaGenerateErr.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaGenerateErr.png)

```terminal
#9 3.978 Prisma schema loaded from libs/db/prisma/schema.prisma  
#9 4.849 Error: Unable to require(*/home/node/node_modules/prisma/libquery_engine-linux-musl.so.node*)
#9 4.849  Error loading shared library libssl.so.1.1: No such file or directory (needed by /home/node/node_modules/prisma/libquery_engine-linux-musl.so.node)
```
From the stack trace, it looks like there are two points worth noting:
    
    *  The shared library `libssl.so.1.1` could not be loaded.
    *  This liblibrary is referenced by `node_modules/prisma/libquery_engine-linux-musl.so.node`

The "libssl.so.1.1" library is probably related to SSL from its name, particularly on Linux, and it's dynamically linked at runtime by "libquery_engine-linux-musl.so.node". After a quick search, we found some Github issues on the OpenSSL repository [Openssl can't find libssl.so.1.1 and libcrypto.so.1.1 · Issue #19497 · openssl/openssl (github.com)](https://github.com/openssl/openssl/issues/19497) and the Prisma repository [Support OpenSSL 3.0 for Alpine Linux · Issue #16553 · prisma/prisma (github.com)](https://github.com/prisma/prisma/issues/16553) that suggest the operating system we're running on may not include the OpenSSL dependency or we may have OpenSSL, but its version doesn't satisfy the requirements.

To double-check, we can examine the base image of our Dockerfile, which is "node:16-alpine" - [docker-node/16/alpine3.15/Dockerfile](https://github.com/nodejs/docker-node/blob/3760675a3f78207605d579f366facbb0d9f26de5/16/alpine3.15/Dockerfile):


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

Previously, we knew that we wanted version 16 of NodeJS running on Linux Apline, but we didn't know the exact versions of NodeJS and Alpine. By examining the Dockerfile, we can see that it uses NodeJS version 16.13.1 and Alpine version 3.15. The next part of the Dockerfile installs basic development dependencies: Node and Yarn. However, there are no instructions to install the OpenSSL library, which is the root cause of the problem.

The solution to this issue is straightforward: install OpenSSL version 1.1 before the *prisma generate* instruction by using APK installer.

```docker
FROM node:16-alpine 
WORKDIR /home/node
COPY . /home/node

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories #change source repo to AliCloud mirror, only needed in China
RUN apk update  # updating of the indexes from remote package repositories
RUN apk add openssl1.1-compat # install openssl 1.1
```

Rrerun the docker build, now it works!

### Prisma Generate - How it works

Even though the problem seems to be solved, there remains a mistery to me: does Prisma need OpenSSL to support SSL connections with the database, and what is the role of *node_modules/prisma/libquery_engine-linux-musl.so.node* in *prisma generate*?

It turns out that the Prisma documentation has a section dedicated to this: [Generating the client (Concepts) (prisma.io)](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client). When you run `*prisma generate*, prisma client package ("yarn add @prisma/client") will generate a *PrismaClient* with three components:

  * Typescript definitions(index.d.ts) 
  * Javascripts code(index.js) - implementaion of the Prisma Client API.
  * Query engine(libquery_engine-xxx.xx.node) under path *node_modules/.prisma/client*.

![prismaBinaryTarget.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaBinaryTarget.png)

Recall that you first need install the *"yarn add @prisma/client"* package. That @prisma/client consists of two key parts:

    * The @prisma/client module itself, which only changes when you re-install the package:  *node_modules/@prisma/client*
    * The .prisma/client folder, temporary, which is the default location for the unique Prisma Client generated from your schema: *node_modules/.prisma/client*

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB*
await this.prisma.user.findMany({...})
```

When we include the PrismaClient in the source code and call *this.prisma.user.findMany*, the prisma client sends this command to the query engine. Then the query engine translates it to SQL queries and sends them forward to the database. Once the database has the query result, it sends it back to the query engine, which translates those raw data to plain JavaScript objects and sends them to the prisam client.

![prismaQueryEngine](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaQueryEngine.png)
<cite> Prisma Concept [Generating the client](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)</cite>

> Prisma Client uses a query engine to run queries against the database. This query engine is downloaded when prisma generate is invoked and stored in the output path together with the generated Client.

The query engine is tailed to be compiled and built on that platform to achieve better performance. 

> It is named query-engine-PLATFORM or libquery_engine-PLATFORM where PLATFORM corresponds to the name of a compile target. Query engine file extensions depend on the platform as well. As an example, if the query engine must run on a Darwin operating system such as macOS Intel, it is called libquery_engine-darwin.dylib.node or query-engine-darwin

It does match the name on my macOS Intel. But how about the name on Linux Alpine 3.15 docker image? We could find it out in [Prisma schema API (Reference)](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options):

![prismaEngineAlpine.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaEngineAlpine.png)

PLATFROM name is *linux-musl*, and it requires OpenSSL 1.1.x to be installed. The full name would be *libquery_engine-linux-musl.so.node* - exactly the name that shows up in the error trace. However, after Primsa 4.8.0, prisma has given better support for OpenSSL 3.0:  [Support OpenSSL 3.0 for Alpine Linu](https://github.com/prisma/prisma/issues/16553#top).

> install OpenSSL 1.1 -> download query engine for platform specific -> prisma generate

### How to run Prisma Migrate Deploy

How do you run migration sqls on a production environment? First you need have the *libs/db/prisma/migration* folder. [Deploying database changes with Prisma Migrate](https://www.prisma.io/docs/guides/deployment/deploy-database-changes-with-prisma-migrate) 
recommends that you do not run it locally againist the production database. Instead, run *prisma migrate deploy* during the release phase. It requires access @prisma/client dependence, so just move it from *devDependencies* to the production *dependencies* section in your package.json.

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

In the previous step, we integrated Prisma into the Dockerfile and are now able to run it. However, the Docker image that final build produces is quite large, 1.53G, and the build time is slow. This is not ideal for a CI/CD pipepline.


```terminal
server ➤ docker images                                                                                                                                                                                                                                              REPOSITORY     TAG       IMAGE ID       CREATED             SIZE
frontend-api   latest    93727cf78c85   About an hour ago   1.53GB
```
Before diving into optimization, let's take a look at how Docker builds images based on the Dockerfile.

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

The process is like a game of Jenga, where each layer is placed on top of another layer like a stack. *From node:16-alpine* is layer n, *COPY . /home/node* is layer n+1， which comes after the layer n. Each instruction corresponds to a layer, and finally, the docker images is just a bunch of layers stacked togher. The most commonly used instructions are *COPY* and *RUN*.
COPY deals with file-related operations, such as copying files from current directory of the build context to the layer in docker image, while RUN is used for executing shell commands or scripts.

The whole process takes a considerable amount of time when built for the first time. However, the second time, it will go much faster as Docker provides a cache for repetive work to speed up the build process. How does the cache work? It simply remembers whether you made changes to the current layer. If any changes are detected in the layers, itself and following layers will get a rebuild. Like the Jenga game, all blocks will get rebuild on top of where that block got pulled.

Clearly, in the above Dockerfile, if you modified *./libs/db/prisma/schema.prisma* file to, e.g, add a new table or table field, it will trigger a rebuild starting from Layer n+3 - COPY . /home/node since ./libs/db/prisma/schema.prisma is under the current build context directory. Docker is smart enough to spot that change and trigger a rerun of that instruction and all instructions below - invalidating the build cache.


![buildFlow.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/buildFlow.png)

You may be wondering that if you only changed schema.prisma, it should just trigger prisma to regenerate its client and rebuild the nest project and nothing more. However, it also triggers "yarn install", which you didn't even touch. Yeah, that Dockerfile is not very efficient. There are a couple of ways to improve it:


### 1.Order your layers

Any change in the source code, not just package.json or yarn.lock, will trigger Docker to reinstall all packages for the project. Acutally, the *COPY . /home/node* happens to do two things at one time: 1. copy project dependencies, 2. copy source code. Those two not only comes with differnet responsibilities but also comes with different modify frequencies. The time you modify your project dependencies is significantly less than the time you modify the source code. So the Dockerfile could be changed to:


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

Different modify frequencies sginal possible different modules of reponsibilities. Most project Dockerfiles could be broken down into the following stages:

1. Prepare the operating system and base image - this step is required only once.
2. Install system-level libraries - this step is also usually required only once.
3. Install project-level dependecies -  this step may need to be repeated if packages are added, removed, or updated
4. Modify your source code in codebase - this step is typically done on a daily basis.
5. Build your project
6. Run it

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

Generally, the instruction *COPY . .* indicates there is some bad smell in the Dockerfile. Even if you use a .dockerinogre file to tell Docker to skip certain files, like common files or directories such as *node_modules* and *dist*, it is recommended that you explicitly write down what files you want to include in the instruction. Explicitly naming what you want to include helps you think about what you're gonna use it for. Typically, coping files is just the first step, and it is usally used as an input for following steps.

```docker
# 4.copy source code, generate prisma client
COPY . .
RUN yarn prisma:generate  
```
The step that takes input is *RUN yarn prisma:generate*. What does it do? it takes a package.json file and looks up where the *schema.prisma* is located. Once it finds the path to schema.prisma, aka *libs/db/prisma/schema.prisma*, it loads that file and then uses @prisma/client package to generate prisma client files. So this instruction takes two files: 
package.json and libs/db/prisma/schema.prisma. Therefore, the input of this instruction just needs to copy those two files, not the all files in codebase.

    * command: yarn prisma generate
    * input:   package.json and libs/db/prisma/schema.prisma
    * output:  node_modues/.prisma/client

The same idea applies to the *RUN yarn run build-frontend* instruction, which runs *nest build frontend* to build frontend-related source code to the dist folder. So source code doesn't need include apps/backend and apps/frontend-emp, it just needs frontend and shared libs, alone with package.json and nest-cli.json.

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

When Docker build tries to decide whether a layer needs to be rebuilt or not, it checks with the cache. If the cache was hit, then there is no need to rebuild this layer. If not, it will run the instructions and rebuild the current layer and following layers. How does the cache work? How does this calculation process work ? [Best practices for writing Dockerfiles: Leverage build cache](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/) mentions that Docker will do a file read and calculate its content checksum and compare it with the one the exsting image for the COPY insturction, and do a command string literal equal check for the RUN instruction. Let's take a look at the common command apk/apt-get for RUN instructions:

```docker
RUN apk update        
RUN apk add openssl1.1-compat 
```

Initially the instructions seems okay. *apk update* will fetch indexs(e.g name, versions, etag) of packages from remote repositories. *apk add openssl1.1-compat* will then get installed with the latest version from the indexes. 

Suppose at this time, the latest versions of libraries in apk repos are:

> openssl1.1-compat=1.0
> wget=1.0
> curl=1.0

The current latest versions of *openssl1.1-compat* is *1.0*, and it will get installed. Then the whole thing gets forgotten for ten years, and it needs to add another library: *wget*.

```docker
RUN apk update        
RUN apk add openssl1.1-compat wget
```

Ten years after, the apk repos is like: 

> openssl1.1-compat=1.9
> wget=1.9
> curl=1.9


To your surpise, the versions in the final docker image that got built are openssl1.1-compat (1.0 old) and wget (1.0 old too). What happened here is that Docker saw `("RUN apk update") in dockerfile == ("RUN apk update") in docker image` - two command strings equals! Then it picked up the cache and skipped actually rebuilding this layer. As a result, it didn't run "apk update" to actuall y update local indexes from remote repo. It ended up with old and stale packages info in the local. The next insturction `("RUN apk add openssl1.1-compat wget") in dockerfiler != ("RUN apk add openssl1.1-compat") in docker image`, then the cache was invalidated, and this layer needed to be rebuilt, hence running apk install with wget version 1.0.

So if it is just a command string literal compare, we could just merge those two into one command:

```diff
- RUN apk update && apk add openssl1.1-compat
+ RUN apk update && apk add openssl1.1-compat wget
```

Now, Docker sees *apk update && apk add openssl1.1-compat* != *apk update && apk add openssl1.1-compat wget*, it will invalidate the cache and rebuild the layer, which is called *cache busting*. Now apk update will fetch the latest indexes, and apk install will install the latest version. The version of wget will be  1.9. However, the version of openssl1.1-compat is 1.9 too. This bump from 1.0 to 1.9 might accidentally break our code and cause some troubles.

The rule of thumb is to lock down the version info for packages. This is called version pinning, you could search for what versions those packages have for that architecture. For example, for apk, you could go  [Alpine Linux packages](https://pkgs.alpinelinux.org/packages?name=openssl1.1-compat&branch=edge&repo=&arch=&maintainer=) or *apk search* to look up version informations. For openssl1.1-compat, its version we picked is *[1.1.1t-r0](https://pkgs.alpinelinux.org/flag/community/openssl1.1-compat/1.1.1t-r0)*.  

```docker
RUN apk update && apk add openssl1.1-compat=1.1.1t-r0 wget=1.9
```

That's better. let's examine this command:

    * command: apk update && apk add openssl1.1-compat=1.1.1t-r0 wget=1.9
    * input:   none
    * output:  openssl1.1-compat lib and wget lib, plus cache under /var/cache/apk/

It has some byproducts from the typical package management tools - the cache. We also need clean that up as it is not necessary.

```docker
RUN  apk update && apk add openssl1.1-compat=1.1.1t-r0 && rm -rf /var/cache/apk/*
```

or add *--no-cache* flag to apk install:

```docker
RUN  apk update && apk add --no-cache openssl1.1-compat=1.1.1t-r0 
```

Given the installion of system libraries are pretty much one-off, you rarelly need to bother to use cache between build to reuse it. However, if you really want to cache between builds to speed up installation proces, you could try leveraging Docker builder's new build tech *BuildKit*:

```docker
RUN \
    --mount=type=cache,target=/var/cache/apk \
    apk update && apk add openssl1.1-compat=1.1.1t-r0
```

It is like mounting a dedicated volume for that, so the cache will be preserverd bewteen builds. This will be elaborated in following yarn/npm section.


### 4. NPM/Yarn install packages  

when Docker build a layer on *RUN yarn install*, it is quite slow and takes quite a big size *1.19G* out of *1.53G* total final docker image size. Just like adding system-level packages with apk add, yarn install also leverages cache.

    * command: yarn install
    * input:   package.json yarn.lock .yarnrc
    * output:  node_modules, plus cache 

Put it simply, when *yarn install* happens, it fetches the package's compressed file and a [metadata](https://github.com/npm/registry/blob/9e368cf6aaca608da5b2c378c0d53f475298b916/docs/responses/package-metadata.md#abbreviated-metadata-format)(name,version,modified time etc) file from *npm registry*, then saves those to the local directory that environment variable `YARN_CACHE_FOLDER` points to, finally decompressing it to the node_modules folder.

```docker
RUN yarn cache dir && yarn install && yarn cache clean
```
The output is clean now, but there is problem with this approache. If you need to add/update/delete a package in the package.json and updates its yarn.lock file, every time you build the docker image, it will fetch from remote repository, save to the cache folder, and move to the node_modules folder for all packages, even if you just want to add one new package. With the help of proper ordering of the layers and relatively low frequency of changing project dependencies, this problem has alredy been mitigated to a great extent.

However, there are possible chances that you need update packages, and to make it even worse, like moments for some critical bug-fixing for live running environment, this would put a lot of congnitive load on you. Therefore, it is helpful to dig more into it and figure out why and how it could be improved.

* ##### BuildKit

One way to address this is to leverage the [BuildKit](https://docs.docker.com/build/buildkit/), the new Docker builder, to act like a mounted volume for caches between builds. BuildKit not only tracks content mounted for specific operations but also can parallelize building independent build stages in [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/). Here, we're going to use RUN --mount type=cache to mount the yarn install operation:

```docker
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install 
```

To do this, set the mount type to cache and target to some directory, then overwrite yarn cache folder with that directory by setting the *YARN_CACHE_FOLDER* enviroment variable for yarn install. My Docker Desktop on Mac is 4.16.2 (95914), which has built-in support for Buildkit and is on by default. You should check which docker version you have installed and may need to explicitly configure it to enable Buildkit.

```terminal
<missing>      2 minutes ago    RUN /bin/sh -c YARN_CACHE_FOLDER=/cache/yarn…   628MB     buildkit.dockerfile.v0
```
This way, the cache - yarn install byproduct - will not be included in the output thus will not go to a layer in docker image. We dont' need to clean the cache after yarn install. The result is a huge drop in terms of docker image size: from 1.19G to 628M. Not bad at all!

* ##### yarn install --perfer-offline


Le't try add brand new package, *yarn add underscore@1.13.6*, then build:

```terminal
=> [stage-0 5/9] RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install                                                                                                                                                                   114.3s
```

roughly 114 seconds, like 2 minutes. Only add this new package *understore*, the time is kinda too long for this simple task.

It is time to take a closer look at how *yarn install* works. By default, everytime it runs yarn install, it will use the version,name and integrity to check if there is a matche in the local cache. 

* if there is a match, it will send a 304 request to check if the one in local cache is stale or not; if stale, it will download new package info. Otherwise, it will just use the one in local cache
* if there is no match, it will fetch latest data from remote repository to the local cache

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
Those extra 304 requests may be the culpritsm as the more packages you have, the longer it takes. Is there any way to adjust the fetch behavior? 

According to the npm blog [NPM v5.0.0](https://blog.npmjs.org/post/161081169345/v500) and [PNPM](https://pnpm.io/cli/install#--prefer-offline), there's an option for yarn install - `--prefer-offline` - that makes npm skip any conditional requests (304 checks) for stale cache data and only hit the network if something is missing from the cache.

```terminal
=> [stage-0 5/9] RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install --prefer-offline                                                                                                                                                   61.7s
```

By using this option, we managed to reduce the installation time from 114.3s to 61.7s :) 

If you want to go completely offline, you could use the methods outlined in the blog [Running Yarn offline](https://classic.yarnpkg.com/blog/2016/11/24/offline-mirror/) to configure *yarn-offline-mirror* and *yarn-offline-mirror-pruning* to pack the dependecies to zip/tarball and upload to souce control. When you build docker image, yarn could directly load packages from the offline mirror folder and move them to the node_modules folder.

<br/>

### 5. Use multi-stage builds


Let's recall the steps we breakdown in previous step:

> 1. Prepare the operating system and base image - this step is required only once.
2. Install system-level libraries - this step is also usually required only once.
3. Install project-level dependecies -  this step may need to be repeated if packages are added, removed, or updated
4. Modify your source code in codebase - this step is typically done on a daily basis.
5. Build your project
6. Run it

When putting all these steps together, we need to keep in mind the input and output. THe output could have some unexpected byproduct that probably involves some custom cleanup shell scripts. Just think about the final image and the running part - if it's in Golang, it only needs a binary executeable to run. It is that simple. However, in NestJS project, it requires more files - three parts: dist folder, node_modules folder, and package.json file. Ideally, we only need those three layers for each one. We should encapsulate the implementation details and have a clear interface or high-level abstraction just like Object-oriented programming (OOP). Any concret implementation details like intermediate or byproducts are not my concerns and shouldn't be!

> [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/) allow you to drastically reduce the size of your final image, without struggling to reduce the number of intermediate layers and files.

Multi-stage builds is what we want here. Currently, we have a naive sequence of stages:

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

The final stage is one where its layer will get to the final docker image. We can use *COPY  --from=prisma-binary* to explictly copy the output from previous stage to the current stage, and the fromStage is ephermeral - all those intermediate stages will not brought to the referring stage. That way, it would create minimal layers in the final docker image , hence reducing the docker image size.

You may wonder why we need to have a separate stage for *prod-dep* to yarn install production dependencies again, why not just copy all dependeices from *dev-dep*, then run *npm prune* to prune out any development dependecies. The reason is that there isn't any good way to do that in yarn, as noted in this issue  [*npm prune* equivalent behavior · Issue #696 · yarnpkg/yarn (github.com)](https://github.com/yarnpkg/yarn/issues/696) :( 

The docker image's size has dropped to 420MB. The node_modules folder is 218MB and .prisma/client is 81.7MB

```terminal
7 minutes ago   COPY /home/node/node_modules/.prisma ./node_…   81.7MB    buildkit.dockerfile.v0
7 minutes ago   COPY home/node/node_modules/ ./node_modules …   218MB     buildkit.dockerfile.v0
```

![dockerHistory.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/dockerHistory.png)

History of size changes of docker image:

![dockerSizeDown.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/dockerSizeDown.png)



### 6. Dockerfile user and permission

By default, Docker containers run as root. That root user is the same root user of the host machine, with UID 0. This could be leveraged by hackers to do malicious attack on host machine. Given the default user is root, we could delete this instructions: *USER root*. [Best practices for writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/) suggest using a non-root user for services that don't need privilege. When creating user and group, consider an explicit UID/GID. We can take some inspiration from the base image (node-16:apline) we used here: [docker-node/Dockerfile at cd7015f45666d2cd6e81f507ee362ca7ada1bfee · nodejs/docker-node (github.com)](https://github.com/nodejs/docker-node/blob/cd7015f45666d2cd6e81f507ee362ca7ada1bfee/18/alpine3.17/Dockerfile)

 
> FROM alpine:3.17
>
> ENV NODE_VERSION 18.14.2
>
> RUN addgroup -g 1000 node \
>  && adduser -u 1000 -G node -s /bin/sh -D node 

The permission of /home/node directory is under the node user. In order to set the running user for the container, you could put that *USER* instruction before the entrypoint and cmd:

```docker
EXPOSE 7021    
USER node  # switch user from default root to node (created in base image)
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]  
```

Run *docker build* again, it throws the following error:

```terminal
@tuo.local ➜ server rvm:(system) git:(uatFt) ✗ docker run 09ba84abb858
$ /home/node/node_modules/.bin/prisma migrate deploy
Error: Can't write to /home/node/node_modules/@prisma/engines please make sure you install "prisma" with the right permissions.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```

It looks like we don't have sufficient permission to write to the node_modules directory. *yarn install* is running under the root user, but the user who runs *prisma migrate deploy* when container is up is node. User node doesn't have enough permission to write to a directory owned by user root.

To verify our thought, we'd better to connect to shell of the container(*docker exec -it xxx  /bin/sh*) and run *ls -al* to check node_modules folder's permission. But the container is down when it is just starting, so we didn't even have a chance to connect to its shell. What we could do here is, in development debug process, we change the CMD/Entrypoint to some script could hang the container forever to prevent it from quitting too early - something like *tail -f*. Also we need install the *bash* system library through apk so we could connect to the bash program and run commands.


```docker
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache bash  #install bash
EXPOSE 7021    
USER node
#ENTRYPOINT [ "npm" ,"run"]    
#CMD ["start:prod_frontend"]  
#dev purpose
ENTRYPOINT ["tail", "-f", "/dev/null"]  #this will keep container quit too early
```

Now run *docker exec -it 916c42e68c3b /bin/bash* and list the folders:

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

As we could see, the group node only has permission to read for *node_modules/@prisma/engines*, but no write permission. Here is a trap: instead of just recklessly adding *chmod -R g=rwx ./node_modules/@prisma/engines* to Dockerfile to "fix" it,  you need think about what it needs to write to this *node_modules/@prisma/engines* folder? Isn't from the official documents (as we list in above section) saying that it only changes when you re-install the package ? Is *node_modules/.prisma/client* supposed to be changed even though we did run a different command *prisma migrate deploy*?

> * The @prisma/client module itself, which only changes when you re-install the package:  *node_modules/@prisma/client*
> * The .prisma/client folder, temporary, which is the default location for the unique Prisma Client generated from your schema: *node_modules/.prisma/client*

Hmmmm, here is the good part about our dev debug trick to get our container running to debug our startup script or command. We could just run exact same command in the bash to see what's going on there. So we run *yarn prsiam migrate deploy* in the bash directly inside the container:

![prismaEngineMissing.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/prismaEngineMissing.png)

We encountered the same error, which is good, as it appears that the folder *node_modules/@prisma/engines* is missing the query engine file *libquery_engine-linux-musl.so.node* when compared to my local node_modules folder. I guess this is because the query engine binary file is quite large and needs to be fetched over the internet, which is a one-off event. However, the .prisma/client folder is frequently updated as users may modify the schema.prisma file many times during development phase. They may even delete the entire folder and regenerate the client, causing the slow fetching of the large binary file which negatively impacts the development experience and added unnecessary cognitive load on developer. Therefore they made a copy inside @prisma/client to just in case .prisma/client needs it.

A quick workaround would be copy @prisma from devDep stage and remember to install OpenSSL 1.1.

```docker
COPY  --from=dev-dep /home/node/node_modules/.prisma ./node_modules/.prisma
COPY  --from=dev-dep /home/node/node_modules/@prisma ./node_modules/@prisma 
COPY libs/db/prisma ./libs/db/prisma 
COPY package.json yarn.lock .yarnrc ./  

RUN apk update && apk add  --no-cache openssl1.1-compat=1.1.1t-r0
EXPOSE 7021    
USER node     
ENTRYPOINT [ "npm" ,"run"]    
CMD ["start:prod_frontend"]  
```

Run again, no problem.

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

We pre-generate all the TS, JS and binary files for the prisma client to use. The advantage is that when container starts, *yarn prisma migrate deploy* doesn't need to fetch over internet and generate clients, so the startup time is fast. The disadvantage is that the size of docker image would be bigger as we include two copies of binary target. 

Another way to avoid copying those two folders into the Docker image is to have the script yarn prisma migrate deploy check the NodeJS-API and download the binary target file when starting up, and then generate clients.

```diff
- COPY  --from=dev-dep /home/node/node_modules/.prisma ./node_modules/.prisma 
- COPY  --from=dev-dep /home/node/node_modules/@prisma ./node_modules/@prisma 
+ RUN chmod -R g=rwx ./node_modules/@prisma/engines #permission
+ ENV PRISMA_BINARIES_MIRROR http://prisma-builds.s3-eu-west-1.amazonaws.com #speed up in China
```
The pros are the size of final docker image is smaller. The cons are it need download binary file and generate clients - both are time consuming. 

### Other improvement tips

* Keep base images up-to-date for better performance and security.
* Minimize the size of each layer as much as you can. For instance, considering using tools like [depcheck - npm (npmjs.com)](https://www.npmjs.com/package/depcheck) to scan the dependencies and remove any unused ones. Also, be careful when deciding whether a new dependecy should be added to the development phase or production phase.
* Keep packages or dependencies up-to-date. [npm-check-updates - npm (npmjs.com)](https://www.npmjs.com/package/npm-check-updates) can help detect any version updates in npm registry. For example, it can show that we have a version update for Prisma: 

> prisma                              ^3.1.1  →    ^4.10.1

This update can resolve OpenSSL issues and also improve query efficiency while reducing the binary target size.

[Release 4.10.0 · prisma/prisma (github.com)](https://github.com/prisma/prisma/releases/tag/4.10.0)

  > Smaller engine size used in Prisma CLI
  >
  > In 4.8.0, we decreased the size of the engines by ~50%, which significantly impacted Prisma Client, especially in serverless environments.
  >
  > In this release, we've reduced the size of Prisma CLI by removing the Introspection and Formatter engines. The introspection functionality is now served by the Migration Engine. A cross-platform Wasm module has entirely replaced the Formatter Engine. This reduces the overall installation size for Prisma CLI.

  The size of query engine has dropped 50%. That is impressive!


After applied with above optimization methods, the docker image's size has reduced to 360M!

![finalDockerSize.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/finalDockerSize.png)

The sizes of node_modules and prisa layer has been shrinked a lot:

![finalDockerLayersSize.png](http://d2h13boa5ecwll.cloudfront.net/20220610dockerfile/finalDockerLayersSize.png)  

  
## Final Dockerfile


```docker
FROM node:16-alpine as base
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && apk update && apk add  --no-cache openssl1.1-compat=1.1.1t-r0

FROM base as dev-dep
WORKDIR /home/node   
COPY package.json yarn.lock .yarnrc ./
RUN --mount=type=cache,target=/cache/yarn YARN_CACHE_FOLDER=/cache/yarn yarn install  --frozen-lockfile --prefer-offline

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

## References

  * [Optimizing builds with cache management (docker.com)](https://docs.docker.com/build/cache/)
  * [Multi-stage builds (docker.com)](https://docs.docker.com/build/building/multi-stage/)
  * [BuildKit (docker.com)](https://docs.docker.com/build/buildkit/)
  * [Top 20 Dockerfile best practices for security – Sysdig](https://sysdig.com/blog/dockerfile-best-practices/)
  * [Prisma \| Next-generation ORM for Node.js \& TypeScript](https://www.prisma.io/)
  * [为什么你应该在docker 中使用gosu？ - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/151915585)
  * [npm install中的缓存和资源拉取机制_照物华的博客-CSDN博客](https://blog.csdn.net/daihaoxin/article/details/105749014)
  * [Permissions error - after declaring USER and WORKDIR · Issue #740 · nodejs/docker-node (github.com)](https://github.com/nodejs/docker-node/issues/740)
  * [User privileges in Docker containers](https://medium.com/jobteaser-dev-team/docker-user-best-practices-a8d2ca5205f4)

   

  