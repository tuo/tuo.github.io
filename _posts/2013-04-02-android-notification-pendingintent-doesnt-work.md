---
layout: post
title: "android notification 多个action时，PendingIntent中extra数据始终一样"
date: 2013-04-02 13:18:35 +0800
published: true
tags: 
- android #tags go here: space-separated string
---

最近需要在项目中添加[Android 4.1 Notification BigPicture](http://capdroid.wordpress.com/2012/07/16/android-4-1-jelly-beans-notification-tutorial-part-ii/) 支持，来让这个提醒条更加美观。下面便是代码：
{% highlight java %}
Intent notificationIntent  = fillDatabaseContentToIntent(context, cursor1, cursor2, false);
Intent shareIntent = fillDatabaseContentToIntent(context, cursor1, cursor2, true);

cursor1.close();
cursor2.close();
if(myDbHelper != null)
    myDbHelper.close(); 
Bitmap bitmapForBigPicture = BitmapFactory.decodeResource(context.getResources(),
        R.drawable.background1);

NotificationCompat.Builder notification =  new NotificationCompat.Builder(context)
        .setSmallIcon(R.drawable.fish_grey)
        .setContentTitle(contentTitle)
        .setContentText(contentText) 
        .setStyle(new NotificationCompat.BigPictureStyle().bigPicture(bitmapForBigPicture).setSummaryText(contentText).setBigContentTitle(contentTitle))
        .addAction(
                android.R.drawable.ic_menu_add,
                "View",
                PendingIntent.getActivity(context, (int) System.currentTimeMillis(),
                        notificationIntent, 0, null))
        .addAction(
                android.R.drawable.ic_menu_share,
                "Share",
                PendingIntent.getActivity(context, (int) System.currentTimeMillis() + 10,
                        shareIntent, 0, null));
                        


private Intent fillDatabaseContentToIntent(Context context, Cursor cursor1, Cursor cursor2, boolean openShare) {
    Intent notificationIntent = new Intent(context, DetailActivity.class);
    notificationIntent.putExtra(DataBaseHelper.CONTENT_ID_FOR_EXTRAS, cursor1.getLong(cursor1.getColumnIndexOrThrow(DataBaseHelper.CONTENT_ID)));
    notificationIntent.putExtra(DataBaseHelper.CATEGORY_ID_FOR_EXTRAS, DataBaseHelper.FAKE_CATEGORY_ID_DAILY);
    notificationIntent.putExtra(DataBaseHelper.CATEGORY_LABEL, cursor2.getString(cursor2.getColumnIndexOrThrow(DataBaseHelper.CATEGORY_LABEL)));
    notificationIntent.putExtra(DetailActivity.TO_SHARE, openShare);
    return notificationIntent;
}       
{% endhighlight %} 
很简单的逻辑， notification中有两个按钮，一个是查看，一个是分享。然后分享的话，我们在extra中将其To_SHARE设置为真，而如果是查看的话，其值为假。

接下来我们在DetailActivity中，获取TO_SHARE的值来决定是否应该调出分享操作。
{% highlight java %}
Bundle extras = this.getIntent().getExtras();
Boolean isToShareFromNotification =  extras.getBoolean(TO_SHARE);
if(isToShareFromNotification){
	gotoShare();
}
{% endhighlight %}
但是我们发现这个 isToShareFromNotification 永远都是false,这个很是奇怪。
整来整去都木有想明白，网上搜了搜，果然发现了一个方案:[android pending intent notification problem](http://stackoverflow.com/questions/3009059/android-pending-intent-notification-problem).

> The way I solved that problem was by assigning a unique requestID when you get the PendingIntent:
> PendingIntent.getActivity(context, requestID, showIntent, 0); 
> By doing so you are registering with the system different/unique intent instances.

然后尝试了一下给一个不同的requestId.

{% highlight java %}
NotificationCompat.Builder notification =  new NotificationCompat.Builder(context)
        .setSmallIcon(R.drawable.fish_white)
        .setContentTitle(contentTitle)
        .setContentText(contentText)
        .setStyle(new NotificationCompat.BigPictureStyle().bigPicture(bitmapForBigPicture).setSummaryText(contentText).setBigContentTitle(contentTitle))
        .addAction(
                android.R.drawable.ic_menu_more,
                "View",
                PendingIntent.getActivity(context, (int) System.currentTimeMillis(),
                        notificationIntent, PendingIntent.FLAG_UPDATE_CURRENT))
        .addAction(
                android.R.drawable.ic_menu_share,
                "Share",
                PendingIntent.getActivity(context, (int) System.currentTimeMillis() + 10,
                        shareIntent, PendingIntent.FLAG_UPDATE_CURRENT));
{% endhighlight %}                              
果然就正常工作了。
                                
                            