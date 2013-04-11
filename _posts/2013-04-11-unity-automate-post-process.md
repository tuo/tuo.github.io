---
layout: post
title: "Unity: Automate Post Process"
date: 2013-04-11 22:25:09 +0800
published: true
tags: #tags go here: space-separated string
---

Everytime after I build a Xcode project from Unity for [PigRush](http://reigngames.com/pigrush/), I need to manually link some system frameworks, some third-party frameworks, add my native code and change some build settings. It is really a pain in the ass. After struggling with Unity's Build Player Pipeline, finally I got process automated. The problems I found during process should cover lots of scenarios you probably will run into and hopefully this will give you some lights :)

##Case Intro
So I have custom libraries and native code reside under *~/UnityWorkspace/PigRush-iOS/Assets/ObjC*, which includes following file structure:

	├── Chartboost
	│   ├── CBAnalytics.h
	│   ├── CBAnalytics.h.meta
	│   ├── Chartboost.h
	│   ├── Chartboost.h.meta
	│   ├── libChartboost.a
	│   └── libChartboost.a.meta
	├── Chartboost.meta
	├── FlurryAnalytics
	│   ├── FlurryAnalytics.h
	│   ├── FlurryAnalytics.h.meta
	│   ├── libFlurryAnalytics.a
	│   └── libFlurryAnalytics.a.meta
	├── FlurryAnalytics.meta
	├── RevMobAds.framework
	│   ├── Headers -> Versions/Current/Headers
	│   ├── Resources -> Versions/Current/Resources
	│   ├── RevMobAds -> Versions/Current/RevMobAds
	│   ├── Versions
	├── PigRushNavtiveCode
	│   ├── Appirater.h
	│   ├── Appirater.h.meta
	│   ├── Appirater.m
	│   ├── Appirater.m.meta
	│   ├── EmailComposer.h
	│   ├── EmailComposer.h.meta
	│   ├── EmailComposer.m
	│   ├── EmailComposer.m.meta
	│   ├── …blablabla
	│   ├── UnityNativeManager.h
	│   ├── UnityNativeManager.h.meta
	│   ├── UnityNativeManager.mm
	│   └── UnityNativeManager.mm.meta

The file structure above is not all, it is part of it.

And the post build process that I'm handling is like following:

1. Import the system frameworks
	- Accounts.framework (*optional*) 
	- GameKit.framework (*optional*)
	- MessageUI.framework
	- MobileCoreServices.framework
	- StoreKit.famework
	- Social.framework (*optional*)
	- libsqlite3.dylib

2. Drag into the project all files and folders I listed above from *~/UnityWorkspace/PigRush-iOS/Assets/ObjC*
	- run *find . -name '*.meta' -type f -delete* to delete .meta files first
	
3. Modify *AppController.h* to add following instance variable declarations for UrbanArship push notification

        NSString *deviceToken;
        NSString *deviceAlias;
        NSString *pushActionURL;    
    
4. Modify *AppController.mm* to add header imports

        #import "Appirater.h"
        #import "RDGameCenterManager.h"
        #import "Chartboost.h"
        #import <RevMobAds/RevMobAds.h>

5. Modify *AppController.mm* to add *[[RDGameCenterManager sharedInstance] disconnectLocalPlayer];* to end of *applicationWillResignActive* method 

6. Modify *AppController.mm* to add *[Appirater appEnteredForeground:YES];* to end of *applicationWillEnterForeground* method 

7. Modify *AppController.mm*  to add other code snippets 

8. Finally set *GCC_ENABLE_OBJC_EXCEPTIONS* to *YES* in BuildSettings


Imagine everytime, you build from Unity and you have to do those steps, it is very paninful process.

##Solution

Note: You can find complete code in my github repo: [UnityAutomatePostProcess](https://github.com/tuo/UnityAutomatePostProcess).

As Unity [PostProcessBuildAttribute](http://docs.unity3d.com/Documentation/ScriptReference/PostProcessBuildAttribute.html) reference says, 

> Add this attribute to a method to get a notification just after building the player.

-- which means that we can use this meta tag to register with Unity engine to kick off post build process.Also notice:

> This is an editor class. To use it you have to place your script in Assets/Editor inside your project folder. 

Pretty straightforward. 

Given that we're gonna play around xcode project file, it looks like using python is good option(as it is built-in supported on Mac). So what this callback script is just simply calling our *post_process.py*. We create a file *CustomPostprocessScript.cs* under *~/UnityWorkspace/PigRush-iOS/Assets/Editor*:
{% highlight csharp %}

    #if UNITY_IPHONE
using UnityEngine;
using UnityEditor;
using UnityEditor.Callbacks;
using System;
using System.Diagnostics;

public class CustomPostprocessScript : MonoBehaviour
{
	[PostProcessBuild]
	public static void OnPostprocessBuild(BuildTarget target, string pathToBuildProject)
	{        
		UnityEngine.Debug.Log("----Custome Script---Executing post process build phase."); 		
		string objCPath = Application.dataPath + "/ObjC";
		Process myCustomProcess = new Process();		
		myCustomProcess.StartInfo.FileName = "python";
        myCustomProcess.StartInfo.Arguments = string.Format("Assets/Editor/post_process.py \"{0}\" \"{1}\"", pathToBuildProject, objCPath);
        myCustomProcess.StartInfo.UseShellExecute = false;
        myCustomProcess.StartInfo.RedirectStandardOutput = false;
		myCustomProcess.Start(); 
		myCustomProcess.WaitForExit();
		UnityEngine.Debug.Log("----Custome Script--- Finished executing post process build phase.");  		
       
	}
}
    #endif

{% endhighlight %}    
Here the *pathToBuildProject* is like *~/UnityWorkspace/XCode/PigRush-XCode* and *objCPath* is the path referring to the folder that our custom libraries and native code reside in(*~/UnityWorkspace/PigRush-iOS/Assets/ObjC*).

Then we dive into our magic *post_process.py* script.

{% highlight python %}

import os
from sys import argv
from mod_pbxproj import XcodeProject
import appcontroller
path = argv[1]
fileToAddPath = argv[2]
    #path: /Users/tuo/UnityWorkspace/XCode/PigRush-XCode-Test1    
print('post_process.py xcode build path --> ' + path)
print('post_process.py third party files path --> ' + fileToAddPath)    
    #Before execute this, you better add a check to see whether your change already exist or not, as if user
    select *Append* rather than *Replace* in Unity when build, this will save you time and avoid duplicates. 
    
print('Step 1: add system libraries ')
    #if framework is optional, add `weak=True`
project = XcodeProject.Load(path +'/Unity-iPhone.xcodeproj/project.pbxproj')
project.add_file('System/Library/Frameworks/CoreTelephony.framework', tree='SDKROOT')
project.add_file('System/Library/Frameworks/MobileCoreServices.framework', tree='SDKROOT')
project.add_file('System/Library/Frameworks/StoreKit.framework', tree='SDKROOT')
project.add_file('System/Library/Frameworks/Social.framework', tree='SDKROOT', weak=True)
project.add_file('usr/lib/libsqlite3.dylib', tree='SDKROOT')

print('Step 2: add custom libraries and native code to xcode, exclude any .meta file')
files_in_dir = os.listdir(fileToAddPath)
for f in files_in_dir:    
    if not f.startswith('.'): #exclude .DS_STORE on mac
    print f        
    pathname = os.path.join(fileToAddPath, f)
    fileName, fileExtension = os.path.splitext(pathname)
    if not fileExtension == '.meta': #skip .meta file
        if os.path.isfile(pathname):
            print "is file : " + pathname
            project.add_file(pathname)
        if os.path.isdir(pathname):
            print "is dir : " + pathname
            project.add_folder(pathname, excludes=["^.*\.meta$"])

print('Step 3: modify the AppController')
appcontroller.touch_implementation(path + '/Classes/AppController.mm')
appcontroller.touch_header(path + '/Classes/AppController.h')

print('Step 4: change build setting')
project.add_other_buildsetting('GCC_ENABLE_OBJC_EXCEPTIONS', 'YES')

print('Step 5: save our change to xcode project file')
if project.modified:
    project.backup()
    project.saveFormat3_2()
{% endhighlight %}
Code is pretty self-explanatory.

Because that we need to mess around with xcode project file, we better use some existing script to do it. And there is one I found which is pretty good: [Mod PBXProj](https://bitbucket.org/icalderon/mod-pbxproj) (The script I refere here doesn't support change build setings and has some problem with escape library search path, you can download good one from my github). 

The most complicted code would be in the Step 3, which we modified our AppController. This is place you probably do:

- add instance variables delcarations in AppController.h
- add code snippet to begin of specfic method in AppController.mm
- add code snippet to end of specfic method in AppController.mm
- add methods to end of AppController.mm
	
Because you probably need modify that file constantly, it would be great there is flexible and easy way to do it.

Let's look at part of *appcontroller.py*:
{% highlight python %} 
    #!/usr/bin/python
import sys
import os

def process_app_controller_wrapper(appcontroller_filename, newContent, methodSignatures, valuesToAppend, positionsInMethod, contentToAppend=None):
    appcontroller = open(appcontroller_filename, 'r')
    lines = appcontroller.readlines()
    appcontroller.close()
    found = False    
    foundIndex = -1
    for line in lines:         
        print line
        newContent += line
        for idx, val in enumerate(methodSignatures):
            print idx, val
            if (line.strip() == val):
                print "founded match method: " + val
                foundIndex = idx
                found = True
        if found :
            if positionsInMethod[foundIndex] == 'begin' and line.strip() == '{':
                print "add code to resign body"
                newContent += ("\n\t" + valuesToAppend[foundIndex] + "\n\n")
                found = False
            if 	positionsInMethod[foundIndex] == 'end' and line.strip() == '}':
                newContent = newContent[:-3]
                newContent += ("\n\n\t" + valuesToAppend[foundIndex] + "\n")
                newContent += "}\n"
                foundWillResignActive = False
        if line.strip() == '@end' and (not contentToAppend is None):
                newContent = newContent[:-6]
                newContent += ("\n\n\t" + contentToAppend + "\n")
                newContent += "@end"                            
            
    print "-------done loop close stream and content: " + newContent                    
    appcontroller = open(appcontroller_filename, 'w')    
    appcontroller.write(newContent)
    appcontroller.close()        

def chartboostAndRevMob():
    return '''
    Chartboost *cb = [Chartboost sharedChartboost];
    cb.appId = @"XXXX";
    cb.appSignature = @"XXX";
    [cb startSession];
    [RevMobAds startSessionWithAppID:@"XXXXX"]; 
    '''
def importHeaders():
    return '''
    #import "Appirater.h"
    #import "RDGameCenterManager.h"
    #import "Chartboost.h"
    #import <RevMobAds/RevMobAds.h>
    #import "FlurryAnalytics.h"
'''

def pushActionInstanceDeclaration():
    return '''
	NSString *deviceTokenString;
	NSString *deviceAlias;
	NSString *pushActionURL;    
    '''
def pushActionDealloc():
    return '''
    [deviceTokenString release];
    [deviceAlias release];
    [pushActionURL release];
    '''

def extraCodeToAddInAppControllerMMFile():
    return '''
//blablabla
- (void)connection:(NSURLConnection *)theConnection didFailWithError:(NSError *)error {
    [UIApplication sharedApplication].networkActivityIndicatorVisible = NO;
    UIAlertView *someError = [[UIAlertView alloc] initWithTitle:
                              @"Network error" message: @"Error registering with server"
													   delegate: self
											  cancelButtonTitle: @"Ok"
											  otherButtonTitles: nil];
    [someError show];
    [someError release];
    NSLog(@"ERROR: NSError query result: %@", error);

}

- (void)alertView:(UIAlertView *)alertView clickedButtonAtIndex:(NSInteger)buttonIndex
{
    NSLog(@"alert button index %d", buttonIndex);

    if(buttonIndex == 1)
    {
        //ok action
        NSURL *url = [NSURL URLWithString:pushActionURL];
        [[UIApplication sharedApplication] openURL:url];
    }

}
//blablabla
'''
    
def touch_implementation(appcontroller_filename):
    # appcontroller = open(appcontroller_filename, 'w')
    # print(" process AppController.mm add imports header")
    newContent = importHeaders()
     
    #starting line of method {
    methodSignatures = []
    #value to append near }
    valueToAppend = []
	#position to add insert at the beginning o
    positionsInMethod = []

    methodSignatures.append('- (void)applicationWillEnterForeground:(UIApplication *)application')
    valueToAppend.append('[Appirater appEnteredForeground:YES];')
    positionsInMethod.append("end")

    methodSignatures.append('- (void) applicationDidBecomeActive:(UIApplication*)application')
    valueToAppend.append(chartboostAndRevMob())        
    positionsInMethod.append("end")
    
    methodSignatures.append('- (void) dealloc')
    valueToAppend.append(pushActionDealloc())        
    positionsInMethod.append("begin")

    process_app_controller_wrapper(appcontroller_filename, newContent, methodSignatures, valueToAppend, positionsInMethod, extraCodeToAddInAppControllerMMFile())    

def touch_header(appcontroller_filename):
    # appcontroller = open(appcontroller_filename, 'w')
    # print(" process AppController.mm add imports header")
    newContent = ''
    #starting line of method {
    methodSignatures = []
    #value to append near }
    valueToAppend = []
    positionsInMethod = []

    methodSignatures.append('@interface AppController : NSObject<UIAccelerometerDelegate, UIApplicationDelegate>')
    valueToAppend.append(pushActionInstanceDeclaration())
    positionsInMethod.append("begin")
    process_app_controller_wrapper(appcontroller_filename, newContent, methodSignatures, valueToAppend, positionsInMethod)    
{% endhighlight %}
A breif explanation is given if you need to change it later.

1. add code to begin/end of specfic method, you just need to copy the method signature and add to *methodSignatures.append('some method signature')*

2. if the code snippet is like one line you just do it like this *valueToAppend.append('[Appirater appEnteredForeground:YES];')* ; and if code snippet is pretty long, you better put it in method like *def pushActionInstanceDeclaration():* and append it like this *valueToAppend.append(pushActionInstanceDeclaration())*

3. to mark the position of begin/end like *positionsInMethod.append("begin/end")*

4. put content to append inside *extraCodeToAddInAppControllerMMFile* and pass it as fifth parameter of *process_app_controller_wrapper*

There you go. You can put the code change in your *appcontroller.py* and it is pretty easy to make changes.

##Fix Library Search Path
When I build from unity and run it in xcode, I got bunch of errors. Among them , one says that

> ld: library not found for -lChartboost

> ld: library not found for -lFlurryAnalytics

But I double checked the chartboost and flurry analytics static lib are indeed imported and showed in Linked Libraries of build settings.After searched on Stackoverflow, I open the build setting of xcode by going to 

	"Targets"-> "Build Settings" -> "Library Search Paths"
 
Then you will see following settings:

	"$(SRCROOT)"
	"$(SRCROOT)/Libraries"
	\"$(SRCROOT)/../../PigRush-iOS/Assets/ObjC/Chartboost\"
	\"$(SRCROOT)/../../PigRush-iOS/Assets/ObjC/FlurryAnalytics\"

WTF! The paths pointing to our custom libraries are got *escaped*. 
Then I drill down the code of *mod_pbxproj.py*, and found following snippet: 
{% highlight python %}
def add_search_paths(self, path, base, key, recursive=True, escape=True):
	modified = False
    #blabla
	if escape :
		if self[base][key].add('\\"%s\\"' % path):#'\\"%s\\"' % path
			modified = True
	else:
		if self[base][key].add(path):#'\\"%s\\"' % path
			modified = True
	return modified
{% endhighlight %}        
which you probably notice the *escape* flag by default is set to *True*. Then I change that flag to *False*, that error was gone :)
 
##Done ? Not Yet
But I still got lots errors in Xcode and no clue aobut what's going wrong. Until that I found there is another PostBuildProcess script from [Kamcord](http://www.kamcord.com/). Kamcord is unity package we imported for use of record and share mobile gameplay video. 

Kamcord also has PostBuildProcess script under Assets/Editor folder, which is like following:
{% highlight csharp %}
public class KamcordPostprocessScript : MonoBehaviour
{

	// Replaces PostprocessBuildPlayer functionality
	[PostProcessBuild]
	public static void OnPostprocessBuild(BuildTarget target, string pathToBuildProject)
	{
		UnityEngine.Debug.Log ("--- Kamcord --- Executing post process build phase.");		
		Process p = new Process();
        p.StartInfo.FileName = "perl";
        p.StartInfo.Arguments = string.Format("Assets/Editor/KamcordPostprocessbuildPlayer1 \"{0}\"", pathToBuildProject);
        p.StartInfo.UseShellExecute = false;
        p.StartInfo.RedirectStandardOutput = false;
        p.Start();		
        p.WaitForExit();		
		UnityEngine.Debug.Log("--- Kamcord --- Finished executing post process build phase."); 
	}
}
{% endhighlight %}
It just executes a perl script, which basically just add Kamcord.framework and related resources to xcode.

Let's look the *Link Library With Libraries*, we found that Kamcord.framework is missing! But if we remove our custom script, it is showing.

Now we had two post build process scripts. Pretty bad, as we dont' know the order it will get executed. And the problem that Kamdcord.framework is missing, maybe is because of orders of execution of scripts.

By taking a look at logs of Unity app, we found actually our *CustomPostprocessScript.cs* runs before *KamcordPostprocessScript.cs*. (I will talk about how to check the logs from *print* in python and *UnityEngine.Debug.Log* in Unity, which it is handy when debugging).

What I want to do here is make sure our custom script always run after other scripts. Because if we execute our script first, then we have no idea what other script is gonna modify, which possibily screws up everything.

Is there any way specify the order of execution of script ? Yes, from [Unity Post Process Mayhem](http://www.ikriz.nl/2012/06/18/unity-post-process-mayhem/), I found that 

	[PostProcessBuild(0)] // <- this is where the magic happens
	public static void OnPostProcessBuildFirst(BuildTarget target, string path)
	{
	    Debug.Log("I get Executed First");
	}
    
>NB: -10 is a higher priority than 100, the default priority is 1
 
Cool, then we can go back to our *CustomPostprocessScript.cs* and modify *[PostProcessBuild]* to *[PostProcessBuild(100)]*. Then we make sure our script always run after other scripts.

You can see the benefits of coding our post process in a sepearate file. By doing this way, we make sure when we update other package like Kamcord, no matter when they change in their script, it won't affect our custom script.

##Tips
To look the logs of post build process scripts, like *print* in python, you can follow steps: 

	open *Console* from spotlight --> left panel FILES *~/Library/Logs* --> expand to *Unity* --> click *Editor.log*

Then you can see logs of Unity. It is also quite usefull when the Unity is freezing, and you want know whether it is really 'dead'.  

Because the xcode project when built from Unity is like 768 M, and it takes Unity 5~10 minutes to build out, which make the process extremely painful.

I'd like to suggest when testing python script, you probably just move a clean copy of AppController or pbproject file to another folder with git supported. Then you can test your script separately without everytime build from Unity.


Python is quite straightford to pick up, like I just spend several mintues to get familiar with its syntax and be able work on it quite easily. BTW, pay attention to the soft tabs and hard tabs when you get indentation problems.

You can have a complete source code here:[UnityAutomatePostProcess](https://github.com/tuo/UnityAutomatePostProcess).

Enjoy unity!

