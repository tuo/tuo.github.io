---
layout: post
title: "Ant Design Pro(v4)中Tabs使用"
date: 2019-11-03 0 21:54:32 +0800
published: true
tags: ant design pro,tabs,header
---

最近因为需要在项目中引入了Ant Design Pro(v4)，其中有一个页面需要在顶部添加Tabs.类似于[https://preview.pro.ant.design/profile/advanced](https://preview.pro.ant.design/profile/advanced)

<img width="600" alt="Screenshot 2019-11-03 at 11 55 41" src="https://user-images.githubusercontent.com/491610/68080180-e4155780-fe30-11e9-8063-a73577086f1f.png">

Ant design里关于Tab组件的使用[Tabs标签页](https://ant.design/components/tabs-cn/)

> 何时使用#
> 提供平级的区域将大块内容进行收纳和展现，保持界面整洁。

> Ant Design 依次提供了三级选项卡，分别用于不同的场景。

> 卡片式的页签，提供可关闭的样式，常用于容器顶部。

> 标准线条式页签，用于容器内部的主功能切换，这是最常用的 Tabs。

> RadioButton 可作为更次级的页签来使用。

还是蛮清楚简单的。 

所以关于使用方式常见的一般分三种情形： 一种是顶部标题不变,底下tab切换变化，URL不变； 一种是底下tab的变化对应顶部的变化；最后是顶部不变，tabs切换，但是URL需要变化。

我们讨论最后一种，因为我们可以想象Tabs的内容里是常见的表格，然后可以查看详情跳到另外一个页面，这个时候从那个页面返回就需要回退到之前所在的tab；同时用户有可能直接收藏跳到该tab的需要。

## 分析

我们想达到这个效果:

http://localhost:8000/project/user/230/wishlist:

<img width="500" alt="Screenshot 2019-11-03 at 12 09 48" src="https://user-images.githubusercontent.com/491610/68080278-e37dc080-fe32-11e9-92de-5b24ffc24205.png"/>

http://localhost:8000/project/user/230/detail:

<img width="500" alt="Screenshot 2019-11-03 at 12 09 44" src="https://user-images.githubusercontent.com/491610/68080279-e4165700-fe32-11e9-8afc-827946ed0193.png"/>

那代码这边如何处理了？

Ant Design Pro在v4里将路由改成了可配置的方式，将这些scaffolding的事情都交给了[umi](https://umijs.org/), 所以基本上你只需要在config下面配置路由就好.([路由和菜单](https://pro.ant.design/docs/router-and-nav-cn))

<img width="400" alt="Screenshot 2019-11-03 at 12 04 48" src="https://user-images.githubusercontent.com/491610/68080324-0f4d7600-fe34-11e9-9b11-54a79c848bd8.png">
	
	{
	    name: '详情',
	    path: '/project/user/:id/detail',
	    component: './project/user/detail',
	},
	{
	    name: '心愿单',
	    path: '/project/user/:id/wishlist',
	    component: './project/user/detail',
	},


这里我们配置了相同的`component`,因为我们希望他们都经过这个HOF来先处理，比如共同的PageHeaderWrapper，还有就是如何render当前的tabs, 最后就是通过路由匹配来懒加载其真正内容的组件。

所以我们就得先看看这个入口的`detail`组件如何实现： 1.Convention over Configuration如何从路由列表中解析出当前的所有tabs; 2. 如何或者以何种规则加载其内容组件.

<img width="700" alt="Screenshot 2019-11-03 at 12 28 39" src="https://user-images.githubusercontent.com/491610/68080399-7cadd680-fe35-11e9-8c41-7b10fc49e882.png">

这是入口文件，可以先看左边的目录。Ant Design Pro组织目录方面是根据模块来划分的，理论上每个模块无非都是UI渲染还有数据获取管理这两个核心功能，所以它一般都有`index.jsx`, `service`, `model`等同一的结构来划分不同的关注点。

首先我们看看如何解析路由, 先获取当前路由的match.假使你访问http://localhost:8000/project/user/230/wishlist:

	isExact: true
    params: {id: "230"}
    path: "/project/user/:id/wishlist"
    url: "/project/user/230/wishlist"

这个时候我们通过match.path去遍历路由配置来获取匹配`/project/user/:id`的所有路由。

	 function findRoute(basePath, routerData, result){
	    if(_.isEmpty(routerData)){
	        return null;
	    }
	    routerData.forEach(item => {
	        if(!item.path){
	            return
	        }
	
	        const basePathFromCurrent = removeLastPart(item.path);
	        if(!(basePath.startsWith(item.path) || basePath.startsWith(basePathFromCurrent))){
	            return
	        }
	        //if path without last part match with current path, then it is the one
	        if(basePath === basePathFromCurrent){
	            let lastSegmentPath = lastSegment(item.path);
	            const realComponentName = capitalize(lastSegmentPath);
	            result.push({ ...item, realComponentName, tabKey: lastSegmentPath })
	            return result;
	        }
	        findRoute(basePath, item.routes, result);
	    });
	 }

	/*
	    name: '详情',	
	    path: '/project/user/:id/detail',
	    component: './project/user/detail',
	    realComponentName: 'Detail',
	    tabKey: detail
	* */
	export function getRoutes(path, routerData=menuConfig) {
	    const basePath = removeLastPart(path);
	    let result = []
	    findRoute(basePath, routerData, result);    
	    return result
	}

原来v1是有这个getRoutes的但是后面因为挪到了umi里，这个就没有了。这里是没办法直接拿过来直接用的，所以我自己快速写了一个简单的，当然代码还是可以优化。

<img width="1190" alt="Screenshot 2019-11-03 at 12 36 50" src="https://user-images.githubusercontent.com/491610/68080471-00b48e00-fe37-11e9-81d5-6324b4df5fbd.png">

所以我们得到了一个变形过了的数据回复，每一个元素都额外有了两个属性： `realComponentName`和`tabKey`。 这个realComponentName就是url最后一部分`wishlist`/`detail`首字母大写，然后tabKey就是url last segment, tab的名字就是用name.

然后我们在tab切换的时候，只要拿到当前url的基础部分，加上当前的tabKey，直接push就可以了。

    onTabChange = key => {
        const {dispatch, match} = this.props;
        const base = removeLastPart(match.url)
        console.log(`${base}/${key}`)
        dispatch(routerRedux.push(`${base}/${key}`));
    };
    
关于内容加载部分就比较简单了，我们用到了React的新属性功能： lazy&Suspense.  [Code-Splitting](https://reactjs.org/docs/code-splitting.html)
	
	 <Switch>
        <Suspense fallback={<div>Loading...</div>}>
            {routes.map(item => (
                <Route key={item.path} path={item.path} 
                    component={React.lazy(() => import(`./${item.realComponentName}`))} 
                    exact={item.exact}/>
            ))}
        </Suspense>
    </Switch>    

到这里，我们只需要在当前目录下添加capitalized的文件名的组件即可，它可以自动被识别加载。

这样我们就通过菜单，自动识别创建tabs，直接添加组件就可以了，无需手动参与配置。

## 引申

这个思路在于发问现实世界里重复性的或者说需要耗费脑力的工作是否可以通过更好的方式和实践来减少。我们要认识我们大脑习惯性的自动巡航，而且从大部分情况来说是非常有益的，让我们能更好的将精力花在值得的更重要的事情上。所以我们开发必须以服务自动巡航这个客观规律为基准，来提高我们日常的开发效率。

减少非核心非业务逻辑的大脑消耗，这样就能更好集中精力在梳理和实现业务逻辑。

回想一下我们后端的目录设计，普遍的基于Node的，比如express，都会分成model, routes, controller等等几个层次，每个层次都有具体的业务模型。 比如我现在要修改User的某个字段或者逻辑，我不得不经常切换与controller/routes/model等等而且他们名字通常都一样，即使借助于IDE的一些快捷键，有时候还是需要切换上下文，非常容易卡壳。专注业务逻辑实现时候，不得不因为目录或者项目组织的原因，挂起那进程，开启新的线程，即使很小的开销，也会影响节奏。

节奏感很重要，除了如何更好组件项目让业务实现能顺畅，一些不同维度的具体实践也有很帮助，比如熟记快捷键(Jetbrain有统一的一套的快捷键Refactor&Navi，只要记住一遍，基本能覆盖所有语言），比如黏贴版工具（Jumpcut，快捷键切换）等等。

所以我们后端的目录构造，跟前端是相对应的。这样一来更容易找到更某个模块相关联的代码和逻辑，脑子不需要多余的开销就能顺畅找到它想要的，丝滑般。。。。smoooooooth, bro

![Chuck Norris](https://i.pinimg.com/originals/1a/22/17/1a2217d5eaaf8293d8abe436b8d6fd92.gif)

在model级别，我们规定文件名需要以`model.js`结尾，路由则已`route.js`结尾。如果是跟前端相关的API比如给小程序或者h5使用的，在frontend.route.js里面写；跟后端管理相关的API，则写在dashboard.route.js里。这里我简化了controller跟业务逻辑的严格区分，实际上你可以有一个service级别来严格做业务逻辑。

那么如何在项目启动时候识别加载这些我们定义好的convention了? 其实很简单， 比如就是说Sequelize的model把。


	const sequelize = new Sequelize(config.database, config.username, config.password, config);
	let routerDir = `${__dirname}/../../routes/`;
	glob
	    .sync('**/*model.js', {cwd: routerDir})
	    .forEach(file => {
	        //console.log("filedb: ", file)
	        const model = sequelize["import"](path.join(routerDir, file));
	        db[model.name] = model;
	    });
	Object.keys(db).forEach(modelName => {
	    if (db[modelName].associate) {
	        db[modelName].associate(db);
	    }
	});

glob一下而已。

关于路由这块，以前按照frontend/dashboard来分，我们可以很简单做jwt的事情，那现在如何办了？

    let rootRouter = Router({mergeParams: true});
    rootRouter.use("/dashboard/", jwt({
        secret: config.jwtDashboardSecret,
        credentialsRequired: true,
        requestProperty: 'user'  //use req.user to get staff
    }).unless({
        path: [
            {url: /^\/api\/dashboard\/auth\/.*/},
        ]
    }));

    rootRouter.use("/frontend/", jwt({
        secret: config.jwtFrontendSecret,
        credentialsRequired: true,
        requestProperty: 'user'  //use req.user to get user current
    }).unless({
        path: [
            {url: /^\/api\/frontend\/auth\/.*/},
        ]
    }));

也是非常简单的。

这样一来，我们保证了前后端近乎相同的目录结构，按照责任划分组织，更好的服务于了现实世界的需要，同时也让程序员更好的专注在核心开发上。

###### 用描述钱学森的话来说： 还得是勤于思考，善于总结





