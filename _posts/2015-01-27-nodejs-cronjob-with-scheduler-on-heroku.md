---
layout: post
title: "Nodejs CronJob on Heroku with Scheduler"
date: 2015-01-27 20:20:08 +0800
tags: #nodejs, #cronjob, #heroku, #scheduler
---

Using nodejs with [cronjob](https://github.com/ncb000gt/node-cron) module to send daily email in midnight is quite easy. But when your app is running on heroku and you only have 1 web dyno, you probably could run into some weird things. For example, you could have nothing happen when pre-assumed cronjob should be fired; or sometimes it works as you expect and sometimes it wouldn't.


# Demo Case: Send Daily Emails
<hr/>

{% highlight javascript %}
	

var cronJob = require('cron').CronJob;
var _cronJobs = {};

var createDailyMail = function(callback){
    //...
    console.log("====createDailyMail email");    
}
    
//remember to add 'time' dependency in package.json if you want to 'timeZone' feature
var _jobs = [
  {
    name: 'Create Email Queue',
	cronTime: '0 2 0 * * *', // every day at 00:02:00 am (extra 2 minutes for dyno wakeup)
    //cronTime: '*/10 * * * * *', // every 10 seconds
    onTick: createDailyMail,
    start: true,
    id: 'createdailyemail',
    timeZone: 'Asia/Shanghai'
  }
];


exports.schedule = function() {
	_jobs.map(function(job) {
		_cronJobs[job.id] = new cronJob(job);
		console.log(common.util.format('%s cronjob scheduled at %s on timezone %s',job.name, job.cronTime, job.timeZone));
	});
}

{% endhighlight %} 


So you would just expect that it would print "createDailyMail" at 00:02:00 everyday midnight on heroku. 

But it doesn't follow your assumption everytime.

Why?

# Dyno Sleeping
<hr/>

The reason is because web dyno went to sleep after some idle time to give you more free time to reduce cost you would pay for. 


To verify that, fire your terminal and run **heroku logs -n 1500**, 1500 means how many lines of logs you want pull out to your local terminal console:

 
    2015-01-23T05:02:00.567188+00:00 app[web.1]: emails: 0
    2015-01-23T05:02:00.567197+00:00 app[web.1]: mailer.process_queue => Finished processing each email address from 0 queued emails
    2015-01-23T05:02:48.546326+00:00 heroku[web.1]: Idling
    2015-01-23T05:02:48.546730+00:00 heroku[web.1]: State changed from up to down
    2015-01-23T05:02:50.845020+00:00 heroku[web.1]: Stopping all processes with SIGTERM
    2015-01-23T05:02:52.249230+00:00 heroku[web.1]: Process exited with status 143
    2015-01-24T01:01:02.745463+00:00 heroku[web.1]: Unidling
    2015-01-24T01:01:02.746350+00:00 heroku[web.1]: State changed from down to starting
    2015-01-24T01:01:06.235129+00:00 heroku[web.1]: Starting process with command `node server.js`
    2015-01-24T01:01:07.039014+00:00 app[web.1]: === LOGS ==========================================    
    2015-01-24T01:01:09.412395+00:00 app[web.1]:  Create Email Queue cronjob scheduled at 0 2 0 * * * on timezone Asia/Shanghai
    2015-01-24T01:07:24.702069+00:00 app[web.1]: Thu Jan 24 2015 01:07:24 GMT+0000 (UTC) | XXXX app started on port 27646
    2015-01-24T01:07:25.729917+00:00 heroku[router]: at=info method=GET path="/" host=XXX.herokuapp.com request_id=a013d631-2bef-4b30-9314-4f356d7c7a8a dyno=web.1 connect=2ms service=18ms status=401 bytes=197
    2015-01-24T01:07:25.728315+00:00 app[web.1]: GET / 401 - - 6.927 ms
    2015-01-24T01:07:24.830608+00:00 heroku[web.1]: State changed from starting to up
    2015-01-24T01:08:00.746585+00:00 app[web.1]: mailer.process_queue => Finished processing each email address from 0 queued emails
    2015-01-24T01:08:00.746266+00:00 app[web.1]: emails: 0  
    

Our cron job fire time is 00:02:00 Shanghai time, which converted to UTC is "16:02:00". But from above logs, you will notice that web dyno went sleep around 01:00:00 am and woke up around next day when some request hit it. So during this **sleep** time, it wouldn't process any task at all including our cron job task who fired at 16pm.

Heroku has a blog on this topic: [App Sleeping on Heroku](https://blog.heroku.com/archives/2013/6/20/app_sleeping_on_heroku), which mentioned:

>When an app on Heroku has only one web dyno and that dyno doesn't receive any traffic in 1 hour, the dyno goes to sleep.

And when it would wake up: 

> When someone accesses the app, the dyno manager will automatically wake up the web dyno to run the web process type. This causes a short delay for this first request, but subsequent requests will perform normally.
Apps that have more than 1 web dyno running never go to sleep and worker dynos (or other process types) are never put to sleep.


We need to take a difference approach on this.


# Heroku Scheduler
<hr/>


Since the heroku would shutdown the dyno when within *one hour* adn there is no request for it, and our cronjob only fires around midnight everyday, we could write a script that simply make a http request just before the cronjob fire time.

Tricky part is that we could put this script locally on some server, and setup another cronjob(*meta cronjob*) to fire this script. But this is not a good idea and just is over-kill for this simple task.

Luckily, heroku is aware of this problem and provide an adds-on called [Heroku Scheduler](https://devcenter.heroku.com/articles/scheduler).

It is a great fit for our case, and it is easy to setup and *almost free* because of what it is built on : the [One-Off Dynos](https://devcenter.heroku.com/articles/one-off-dynos):

> Scheduler add-on runs one-off dynos that will count toward your dyno-hours that you will be charged for each month.

Think about the price, heroku already provide you [750 free dyno-hours per app per month](https://devcenter.heroku.com/articles/usage-and-billing#750-free-dyno-hours-per-app). Suppose my web dyno runs 23 hours per day then we still got 750 - 23 * 30 = 60 hours free time, and our Scheduler will get this free time. 

Good news is that our scheduler is so simple, i.e. just make a http request and only runs once per day, so it is pretty much free for us :)

We start with the script by creating a file **wake_up_dyno.js** under the root of project:

{% highlight javascript %}
var http = require('http'); //importing http

var options = {
    host: 'XXX.herokuapp.com',
    port: 80,
    path: '/WAKEUP_DYNO'
};
console.log("======WAKUP DYNO START");
http.get(options, function(res) {
    res.on('data', function(chunk) {
        try {
            // optional logging... disable after it's working
            console.log("======WAKUP DYNO: HEROKU RESPONSE: " + chunk);
        } catch (err) {
            console.log(err.message);
        }
    });
}).on('error', function(err) {
    console.log("Error: " + err.message);
});

{% endhighlight %} 

Very straightforward. 

Then we need to go to heroku scheduler adds-on page:

1. create a schedule job
2. set task name to **node wake_up_dyno.js**
3. dyno size 1x by default
4. frequence to daily 
5. run time set to: 16:00 UTC 
6. save 


Then you're pretty much done. Just pay attention to the run time, it is utc time so make sure you calculate/convert correctly from your target timezone. I have just made a dumb mistake by putting wrong 04:00 UTC time rather than 16:00 UTC.

![heroku scheduler](https://cloud.githubusercontent.com/assets/491610/5917762/d489517c-a65b-11e4-98fc-f8a9938b774d.png)



There you go. Your little cronjob should work as you expect now :)








 






