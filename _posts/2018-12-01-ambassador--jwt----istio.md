---
layout: post
title: "Ambassador(API Gateway) + Istio(Service Mesh) 南北+东西"
date: 2018-11-30 21:54:32 +0800
published: true
tags: #tags go here: space-separated string
---


熟悉了Kubernetes那些基础概念之后(Service,Pod,Deployment,PV/PVC, StorageClass)等等止呕后，你有了一个cluster集群可以跑起来一些模块的微服务了。接下来就是如何暴露这些微服务能让外部访问？传统的部署中，我们会有Nginx做负载均衡和反向代理，将外部的访问按规则分发给具体的应用服务上。那么在kubernetes里该怎么办？


### Ingress

> The Ingress is a Kubernetes resource that lets you configure an HTTP load balancer for applications running on Kubernetes, represented by one or more Services. Such a load balancer is necessary to deliver those applications to clients outside of the Kubernetes cluster.

具体可以参考官方的文档说明: [Kubernetes Concept: Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)

![20180730173812](https://user-images.githubusercontent.com/491610/49329075-f6e63300-f5b4-11e8-9e91-cec93eb20c2e.png)


那么具体实现的便是ingress controller了。

> An ingress can be configured to give services externally-reachable URLs, load balance traffic, terminate SSL, and offer name based virtual hosting. An ingress controller is responsible for fulfilling the ingress, usually with a loadbalancer, though it may also configure your edge router or additional frontends to help handle the traffic.

一个简单的Ingress资源示咧：

	apiVersion: extensions/v1beta1
	kind: Ingress
	metadata:
	  name: ingress
	  annotations:
	    nginx.ingress.kubernetes.io/rewrite-target: /
	spec:
	  rules:
	  - host: myminikube.info
	    http:
	      paths:
	      - path: /
	        backend:
	          serviceName: frontend
	          servicePort: 80
	      - path: /auth
	        backend:
	          serviceName: auth
	          servicePort: 7002
	      - path: /products
	        backend:
	          serviceName: products-server
	          servicePort: 7002
	      - path: /reviews
	        backend:
	          serviceName: reviews-server
	          servicePort: 7002



### Ingress-Nginx不足


Ingress-Nginx应该说能大部分满足我们的需求，而且nginx一开始作为高性能的web服务器，慢慢演变支持了更多传统proxy用户案例之外的功能。但是问题是Nginx推出了商业版的[Nginx Plus](https://www.nginx.com/products/nginx/#what-is), 收费版本，而且有些功能是Nginx开源版本没有的： 比如Nginx Plus就有那个监控的dashboard，不得不nginx log自己摸索。

[https://www.nginx.com/products/nginx/#compare-versions](https://www.nginx.com/products/nginx/#compare-versions)


![Nginx vs Nginx Plus](https://user-images.githubusercontent.com/491610/49329335-f8fdc100-f5b7-11e8-8c76-0cd394d27995.png)


这里我们看到Nginx Plus还是有有一些是Nginx没有的，但是这里我们看到Kubernete Ingress Controller是支持的，但是不支持比如JWT Authentication；而作为一个微服务场景，特别是主要以API为主要实现方式的场景里，认证Authentiction是非常重要的一环，而[JWT(JSON Web Token)](https://auth0.com/docs/jwt)就是用来保护授权我们API的访问的。 

>  NGINX Plus “extend[s] NGINX into the role of a frontend load balancer and application delivery controller


问题是这个商业化带来很多不确定，你不知道那些功能是会像是JWT一样会被移除开源会挪到企业版本里。

### [Envoy](https://www.envoyproxy.io/) by Lyft

![0_p2o7fpqs2ruyxh9a](https://user-images.githubusercontent.com/491610/49329429-b6d57f00-f5b9-11e8-9728-aa9f57cfa9fc.png)

简单的说envoy就是为微服务量身订造的，更加适合微服务的架构和体系。它的作者在这篇文章[Our Move to Envoy](https://blog.turbinelabs.io/our-move-to-envoy-bfeb08aa822d)详细说明为什么创作它的理由。 [Envoy: 7 months later](https://eng.lyft.com/envoy-7-months-later-41986c2fd443):

> In a nutshell, Envoy is a “service mesh” substrate that provides common utilities such as service discovery, load balancing, rate limiting, circuit breaking, stats, logging, tracing, etc. to polyglot (heterogeneous) application architectures.

后面讲到的Ambassador和Istio正是基于Envoy,所以他们的结合应该说是非常丝滑。


### [Ambassador](https://www.getambassador.io/) (JWT) - API Gateway

> Ambassador is an open source, Kubernetes-native microservices API gateway built on the Envoy Proxy. Ambassador is built from the ground up to support multiple, independent teams that need to rapidly publish, monitor, and update services for end users. Ambassador can also be used to handle the functions of a Kubernetes ingress controller and load balancer.


* Makes it easy to change and add to your Envoy configuration via Kubernetes annotations
* Adds the out-of-the-box configuration necessary for production Envoy, e.g., monitoring, health/liveness checks, and more
* Extends Envoy with traditional API Gateway functionality such as authentication
* Integrates with Istio, for organizations who need a full-blown service mesh

Ambassador是基于Envoy的API Gateway实现。安装还是蛮简单的： 部署Ambassador;定义Ambassador服务;最后创建路由

	---
	apiVersion: v1
	kind: Service
	metadata:
	  name: httpbin
	  annotations:
	    getambassador.io/config: |
	      ---
	      apiVersion: ambassador/v0
	      kind:  Mapping
	      name:  httpbin_mapping
	      prefix: /httpbin/
	      service: httpbin.org:80
	      host_rewrite: httpbin.org
	spec:
	  ports:
	  - name: httpbin
	    port: 80



这里我们不多言，但是看到好处在于可以在service里直接通过annotation的方式定义路由，这样还是很方便的。

那么我们这里就要讲到JWT，我们就好奇如何在ambassador中引入认证服务。官方文档里有部分提到[Basic Authentication](https://www.getambassador.io/user-guide/auth-tutorial)但是列子里只是讲到了如何使用基础的basic http auth,，但是问题是我们需要的是JWT的认证方式，所以这个例子并不能直接用，但是好像也没有其他JWT的现存的可以直接用。

好在我们看到其中的一个章节：[The External Authentication Service](https://www.getambassador.io/reference/services/auth-service/)

![auth-flow](https://user-images.githubusercontent.com/491610/49329594-598efd00-f5bc-11e8-841f-95080b962913.png)

首先我们写一个JWT的decode的middleware:

	var jwt = require('jsonwebtoken');
	var config = require('../config.js');
	
	module.exports = function(req, res, next) {
	    /*
	     * Check if authorization header is set
	     */	    
	     var token = ""
	     if(req.cookies && req.cookies.id_token){
	        token = req.cookies.id_token
	     }else if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
	        token = req.headers.authorization.split(' ')[1];
	     } else if (req.query && req.query.token) {
	        token = req.query.token;
	     }
	    if(token) {
	        try {
	            /*
	             * Try to decode & verify the JWT token
	             * The token contains user's id ( it can contain more informations )
	             * and this is saved in req.user object
	
	             { name: 'Admin',
	              email: 'admin@qq.com',
	              id: 1,
	              iat: 1543476317,
	              exp: 1543562717 }
	
	             */
	
	             const result = jwt.verify(token, config.JWT_SECRET);
	             console.log("result", result)
	             res.set('x-admin-id', result.id);
	             res.set('x-admin-email', result.email);
	            req.user = result;
	        } catch(err) {
	            /*
	             * If the authorization header is corrupted, it throws exception
	             * So return 401 status code with JSON error message
	             */
	            return res.status(401).json({
	                error: {
	                    msg: 'Failed to authenticate token!'
	                }
	            });
	        }
	    } else {
	        /*
	         * If there is no autorization header, return 401 status code with JSON
	         * error message
	         */
	        return res.status(401).json({
	            error: {
	                msg: 'No token!'
	            }
	        });
	    }
	    next();
	    return;
	};


然后post login的代码里我们从body里提出username/password然后校验:
	
	app.post('/extauth/login', (req, res, next) => {
	  const {username, password} = req.body;
	  const defaultEmail = "admin@qq.com";
	  const defaultName = "Admin";
	  const defaultPassword = "123";
	  if (username !== defaultEmail || password !== defaultPassword) {
	      console.log("========= DONT MATCH")
	      res.status(400).json({ message: 'Username or password is incorrect' })
	      return;
	  }
	  const data = {name: defaultName, email: defaultEmail, id: 1};
	  const expiresIn = 60 * 60 * 24; // 24 hours
	  const token = jwt.sign(data, jwtSecret, {expiresIn});
	  res.cookie('id_token', token, {maxAge: expiresIn * 1000, httpOnly: true});
	  return res.json({admin: data, id_token: token});  
	});
		
	app.all('/extauth/nodebackend/', authMiddlware, function (req, res, next) {
	  console.log("nodebackend - req user: ", req.user);
	  res.send('OK (authenticated)')
	  //next();
	})
	
	app.all('*', function (req, res, next) {
	  console.log(`Allowing request to ${req.path}`)
	  res.send('OK (not /qotm/quote)')
	  //next();
	})
	
对于/nodebackend的路由，我们让其被保护，其他的通过。但是跑起来去登录发现， req.body输出是空，就是说username/password始终是null， 发生了什么事情？

然后我们看ambassador文档：

> For every incoming request, the HTTP method and headers are forwarded to the auth service. Only two changes are made:

	* The Content-Length header is overwritten with 0.
	* The body is removed.

> Envoy (through patches we’ve contributed) allows the attachment of arbitrary metadata to service instances, and the definition of routing rules based on that metadata. 

所以Ambassador会将http method和headers来传给Auth service, 记住所有方法都会先进入auth service再转发到实际的serivce或者被踢回。

这就是为什么了body是空的？ 所以我们这里必须将username/password作为http basic auth的方式传递进来。至于怎么做？你可以参考： [ambassador-auth-service](https://github.com/datawire/ambassador-auth-service/blob/master/server.js)

> Allowing the Request to Continue (HTTP status code 200)
To tell Ambassador that the request should be allowed, the external auth service must return an HTTP status of 200. Note well that only 200 indicates success; other 2yz status codes will prevent the request from continuing, as below.


> Preventing the Request from Continuing (any HTTP status code other than 200)

所以我们这里 `return res.json({admin: data, id_token: token});  ` 会导致404错误，因为/login在其他服务上没有实现。。。但是我们要不能传递500，401吧。

所以这里我们特殊处理下返回...201.

> res.status(201).send({admin: data, id_token: token});

所以当其他服务想要获取当前认证的用户时，req.user将不会有作用，你需要从header上拿。这里你需要明确在allowed_headers加上x-admin-id和x-admin-email或者啥的。


	---
	apiVersion: v1
	kind: Service
	metadata:
	  name: example-auth
	  annotations:
	    getambassador.io/config: |
	      ---
	      apiVersion: ambassador/v0
	      kind:  AuthService
	      name:  authentication
	      auth_service: "example-auth:7002"
	      path_prefix: "/extauth"
	      allowed_headers:
	      - "x-qotm-session"
	      - "x-admin-id"
	      - "x-admin-email"
	spec:
	  type: ClusterIP
	  selector:
	    app: example-auth
	  ports:
	  - port: 7002
	    name: http-example-auth
	    targetPort: http-api


### [Istio](https://istio.io/): Service Mesh

如果说ambassador解决是纵向的通信分发，那么Service Mesh(istio)就是解决横向微服务之间的交通通信。

> Istio gives you:

> Automatic load balancing for HTTP, gRPC, WebSocket, and TCP traffic.
Fine-grained control of traffic behavior with rich routing rules, retries, failovers, and fault injection.

> A pluggable policy layer and configuration API supporting access controls, rate limits and quotas.

> Automatic metrics, logs, and traces for all traffic within a cluster, including cluster ingress and egress.

> Secure service-to-service authentication with strong identity assertions between services in a cluster.



![Istio structure](https://istio.io/docs/concepts/what-is-istio/arch.svg)

这里的Proxy就是基于Envoy的，基本上作为sidecar拦截所宿主的service的网络通信并且向pilot中央报告，然后根据规则等等(mixer)做出服务查找通信等等。

[Ray Tsang: Making Microservices Micro with Istio and Kubernetes](https://www.youtube.com/watch?v=4x79RfMaOyo)演示的非常好，可以看看。


### [Ambassador and Istio: Edge Proxy and Service Mesh](https://www.getambassador.io/user-guide/with-istio/)


> Ambassador is a Kubernetes-native API gateway for microservices. Ambassador is deployed at the edge of your network, and routes incoming traffic to your internal services (aka "north-south" traffic). Istio is a service mesh for microservices, and is designed to add application-level Layer (L7) observability, routing, and resilience to service-to-service traffic (aka "east-west" traffic). Both Istio and Ambassador are built using Envoy.


所以看起来Ambassador和Istio合并看来是非常不错的组合。可以参考官方的博客： [https://www.getambassador.io/user-guide/with-istio/](https://www.getambassador.io/user-guide/with-istio/) 这里并没有啥特别的，这里实战的话还是用Helm比较方便干净点。

### 参考


[Envoy vs NGINX vs HAProxy: Why the open source Ambassador API Gateway chose Envoy](https://blog.getambassador.io/envoy-vs-nginx-vs-haproxy-why-the-open-source-ambassador-api-gateway-chose-envoy-23826aed79ef)

[Part 3: Deploying Envoy as an API Gateway for Microservices](https://www.datawire.io/envoyproxy/envoy-as-api-gateway/)

[API Gateway vs Service Mesh](https://blog.getambassador.io/api-gateway-vs-service-mesh-104c01fa4784)

[Managing service mesh on Kubernetes with Istio](https://medium.com/containerum/managing-service-mesh-on-kubernetes-with-istio-60ee5e8c5efe)



