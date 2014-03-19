---
layout: post
title: "UrbanAirship Android Received push with invalid authorization on platform GCM"
date: 2014-03-19 20:46:47 +0800
tags: android urban airship gcm
---

I was trying integrate Urban Airship to an android application so that I could send push notification to all registered android devices via Google’s [GCM](http://developer.android.com/google/gcm/index.html) (Google Cloud Messaging for Android) service.

Urban Airship does have a really good documentation about to how to set it up on Android: [Android: Getting Started with Push](http://docs.urbanairship.com/build/android.html#setting-up-gcm-support-for-your-app). So I followed the instruction above and integrated with android app locally. But when I try to test the push notification by going to *Messages* -> *Test Push* in the left panel like following screenshot ![Invalid Authorization on GCM](http://farm8.staticflickr.com/7155/13265323853_a0189bc83b_b.jpg).

It keeps saying **Received push with invalid authorization on platform GCM**.

##Problem breakdown

I searched in google and found several same issues reported by people, e.g., [Received push with invalid authorization on platform GCM in Urban push console](https://support.urbanairship.com/customer/portal/questions/4449356-received-push-with-invalid-authorization-on-platform-gcm-in-urban-push-console) and  [Received push with invalid authorization on platform GCM](https://support.urbanairship.com/customer/portal/questions/4690667-received-push-with-invalid-authorization-on-platform-gcm). The thing is that it works fine on iOS but not on Android, the kind-hearted guy from Urban Airship suggested to look through their [GCM Troubleshooting Guide](https://support.urbanairship.com/customer/portal/articles/823114-gcm-troubleshooting-guide). 

Well, I did verify each steps illustrated in the troubleshooting guide, the api key, package, sender id and so on. Still no clue for it.I take a step back and think the problem clearly refers to "invalid authroization on platform GCM", then it should be something wrong with GCM settings.

Here is the settings in google api console:![Google API Console](http://farm4.staticflickr.com/3756/13265170335_69a45bd164_b.jpg)

There is SHA1 string and a package name for it, you have to make sure you have right SHA1 and package name from your app. Based on the documentation about [Keys, access, security, and identity](https://developers.google.com/console/help/new/#usingkeys). I need doublec check the apk generated should have same SHA1 and package name. To verify the SHA1 string, there is post in stackoverflow [How to find out which key was used to sign an app?](http://stackoverflow.com/questions/11331469/how-to-find-out-which-key-was-used-to-sign-an-app)

	2:35 ~/Desktop/frames/PushSample-debug-unaligned/META-INF $ keytool -printcert -file CERT.RSA
	Owner: CN=Android Debug, O=Android, C=US
	Issuer: CN=Android Debug, O=Android, C=US
	Serial number: 517787d8
	Valid from: Wed Apr 24 15:20:56 CST 2013 until: Fri Apr 17 15:20:56 CST 2043
	Certificate fingerprints:
		 MD5:  9C:DC:4C:FA:5A:74:F0:83:9D:17:D8:3B:1A:C3:BD:E5
		 SHA1: 34:10:4F:F9:9D:63:7A:56:BE:94:AD:07:B3:80:3B:A1:EE:9A:E6:67
		 Signature algorithm name: SHA1withRSA
		 Version: 3
and compare with the SHA1 string in *~/.android/debug.keystore*:

	12:36 ~/Desktop/frames/PushSample-debug-unaligned/META-INF $ keytool -list -keystore ~/.android/debug.keystore
	Enter keystore password:android
	
	Keystore type: JKS
	Keystore provider: SUN
	
	Your keystore contains 1 entry
	
	androiddebugkey, Apr 24, 2013, PrivateKeyEntry,
	Certificate fingerprint (MD5): 9C:DC:4C:FA:5A:74:F0:83:9D:17:D8:3B:1A:C3:BD:E5

The SHA1 string is the same, then how about the package name? 

Refer to this post [Resolving the package name of Android APK](http://stackoverflow.com/questions/6289149/resolving-the-package-name-of-android-apk), I'm able to print the apk infos about package name:

	12:40 ~/Desktop/frames $ /Users/tuo/Documents/SDKS/adt-bundle-mac-x86_64-20131030/sdk/build-tools/android-4.4/aapt  dump badging PushSample-debug-unaligned.apk
	package: name='com.reigndesign.rdapp1' versionCode='1' versionName='1.0'
	sdkVersion:'7'
	targetSdkVersion:'19'
	uses-permission:'android.permission.INTERNET'
	...
	
Also the package name matches.

Here is the question the package name and SHA1 are correct, then how come it still says "*invalid authorization*" ?	


##Android key vs Server key

My instinct that accumulated from countless red-eye days of programming told me that I should rollback everything and start walk through the documentation as carefully as I can from scratch.

And I did find out why.

In one section about [Get your API Key from Google](http://docs.urbanairship.com/build/android.html#get-your-api-key-from-google), it says:

	4.Generate an API Key
	
		A. Click on the text where it says “Google Cloud Messaging for Android” in the image above.
		
		B. This takes your to the Google APIs page. Click on API Access.
		
		C. Urban Airship takes care of API Access authorization for you, so you do not need to create an OAuth 2.0 client ID.
		
		D. Click on “Create a new Server key...” to generate your API Key.
		
		E. Do not specify any IP addresses in the form, and click “Create”
		
What I realized is that holy ****, it is god dammned *Server key* instead of *Android key*. I did go back and take a detail look at what android key is about:

	Create an Android key and configure allowed Android applications
	This key can be deployed in your Android application. API requests are sent directly to Google from your client Android device. Google verifies that each request originates from an Android application that matches one of the certificate SHA1 fingerprints and package names listed below. You can discover the SHA1 fingerprint of your developer certificate using the following command:
	keytool -list -v -keystore mystore.keystore
		
Then I understand it better. Because ubarn airship is acting on our app's behalf dealing with GCM platform rather than let our app do the dirty job. So serve key makes sense to me now.

So I created a *Server key* and try it again, no more errors.

![Server key](http://farm8.staticflickr.com/7224/13265325123_72842e53a3_b.jpg)





