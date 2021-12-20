---
layout: post
title: "android  permission handling on marshmallow and preM"
date: 2015-12-21 22:24:35 +0800
published: true
tags: android permission marshmallow
---

<br/>

Before android marshmallow, permission prompt, e.g. making a call, reading contacts, retrieving user location, happens in Google Play when you press **install** button.

<div>
<img src="http://d2h13boa5ecwll.cloudfront.net/misc/1e15dd54-a833-11e5-9bef-37607c5d87f6.png" align="middle" height="250" width="250" style="display: block;" >
</div>
<br/>

On marshmallow, story is little bit different - it kinda looks like what iOS does. Official android developer website has a dedicated section for permission handling: [Working with System Permissions](http://developer.android.com/intl/es/training/permissions/index.html).

When I try to get this new stuff work in practice, two things worth some elaborations: Never ask again and pre marshmallow handling.

# `Never ask again` checked

The new permission workflow works like following. Suppose, there is a button that you could press to make call. 

{% highlight java %}
private static final int PERMISSIONS_REQUEST_CALL_PHONE = 201;
private String mManifestPersmission;
private int mRequestCode;

mManifestPersmission = Manifest.permission.CALL_PHONE;
mRequestCode = PERMISSIONS_REQUEST_CALL_PHONE;

int permerssion = ActivityCompat.checkSelfPermission(mActivity, mManifestPersmission);                     boolean should = ActivityCompat.shouldShowRequestPermissionRationale(mActivity, mManifestPersmission);            
if (permerssion != PackageManager.PERMISSION_GRANTED) {
    requestPermission();
}

private void requestPermission() {
    ActivityCompat.requestPermissions(mActivity, new String[]{mManifestPersmission}, mRequestCode);
}
{% endhighlight %} 	


And when you press the call btn *first time*, it would prompt:

<div>
<img src="http://d2h13boa5ecwll.cloudfront.net/misc/a7229ec8-a830-11e5-98b5-93ef5e709471.png" align="middle" height="250" width="250" style="display: block;" >
</div>
<br/>

If you choose **ALLOW**, it would just go and call like pre marshmallow; If you choose **DENY**, it means you have denied permission for user to access, then better we'd show an alert to guide user what's going like following screenshot:

<div>
<img src="http://d2h13boa5ecwll.cloudfront.net/misc/a727684a-a830-11e5-9b10-68faded2fbad.png" align="middle" height="250" width="250" style="display: block;" >
</div>
<br/>

The idea here is, so user has denied permission, we need provide some explanation(i.e. rationale) to tell user why we need it. Also we provide two actions: **Retry** and **I'm Sure**. Click **Retry**, it would prompt permission asking alert again; Click **I'm sure**, then it just dismiss silently because user has explicitly known what he is doing.

So if you clicked **Retry** or you press call button second time, the permission requesting window will have an option: **Never ask again**.

<div>
<img src="http://d2h13boa5ecwll.cloudfront.net/misc/a74de146-a830-11e5-8a4e-70b11bb07db4.png" align="middle" height="250" width="250" style="display: block;" >
</div>
<br/>

The tricky part here what happens if user has denied with *Never ask again* checked?
It turns out in **onRequestPermissionsResult**, you could query *shouldShowRequestPermissionRationale* to tell whether user has denied with Never ask again option.

The code in **onRequestPermissionsResult**:

{% highlight java %}
public void onRequestPermissionsResult(int requestCode, String permissions[], int[] grantResults) {
    if(requestCode == mRequestCode){
        Logger.t(mManifestPersmission);
        boolean hasSth = grantResults.length > 0;
        if(hasSth){
            if(grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                //user accepted , make call
                Logger.d("Permission granted");
                if(this.mAffirmativeCallback != null){
                    this.mAffirmativeCallback.onPermissionConfirmed();
                }
            } else if(grantResults[0] == PackageManager.PERMISSION_DENIED) {
                boolean should = ActivityCompat.shouldShowRequestPermissionRationale(mActivity, mManifestPersmission);
                if(should){
                    //user denied without Never ask again, just show rationale explanation
                    AlertDialog.Builder builder = new AlertDialog.Builder(mActivity, R.style.AppCompatAlertDialogStyle);
                    builder.setTitle("Permission Denied");
                    builder.setMessage("Without this permission the app is unable to make call.Are you sure you want to deny this permission?");
                    builder.setPositiveButton("I'M SURE", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.dismiss();
                        }
                    });
                    builder.setNegativeButton("RE-TRY", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.dismiss();
                            requestPermission();
                        }
                    });
                    builder.show();

                }else{
                    //user has denied with `Never Ask Again`, go to settings
                    promptSettings();
                }
            }
        }
    }
}

private void promptSettings() {
    AlertDialog.Builder builder = new AlertDialog.Builder(mActivity, R.style.AppCompatAlertDialogStyle);
    builder.setTitle(mDeniedNeverAskTitle);
    builder.setMessage(mDeniedNeverAskMsg);
    builder.setPositiveButton("go to Settings", new DialogInterface.OnClickListener() {
        @Override
        public void onClick(DialogInterface dialog, int which) {
            dialog.dismiss();
            goToSettings();
        }
    });
    builder.setNegativeButton("Cancel", null);
    builder.show();
}

private void goToSettings() {
    Intent myAppSettings = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + mActivity.getPackageName()));
    myAppSettings.addCategory(Intent.CATEGORY_DEFAULT);
    myAppSettings.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    mActivity.startActivity(myAppSettings);
}
{% endhighlight %}     
 
 So if *shouldShowRequestPermissionRationale* returns false, we will display an alert for go to app settings to allow user manually toggle permissions.
 
 <div>
 <img src="http://d2h13boa5ecwll.cloudfront.net/misc/a7533cf4-a830-11e5-9b3f-5e80fe9880cd.png" align="middle" height="250" width="250" style="display: block;" >
 </div>
 <br/>

Last point, when request permission, we need a way to distinguish two case when *shouldShowRequestPermissionRationale* returns false. According to android documentation:[shouldShowRequestPermissionRationale](https://developer.android.com/intl/es/training/permissions/index.html#explain-need)

    To help find the situations where you need to provide extra explanation, the system provides the Activity.shouldShowRequestPermissionRationale(String) method. This method returns true if the app has requested this permission previously and the user denied the request. That indicates that you should probably explain to the user why you need the permission.

    If the user turned down the permission request in the past and chose the Don't ask again option in the permission request system dialog, this method returns false. The method also returns false if the device policy prohibits the app from having that permission.

when shouldShowRequestPermissionRationale return false, it could be either user request permission first time or user has denied with *Never ask again* before. Hence we need modify request code a little bit:

{% highlight java %}

private static final int PERMISSIONS_REQUEST_CALL_PHONE = 201;
...
boolean should = ActivityCompat.shouldShowRequestPermissionRationale(mActivity, mManifestPersmission);            
if (permerssion != PackageManager.PERMISSION_GRANTED) {
    if (should) {
        // should show some explanation alert, but here now, just prompt ask again                    
        requestPermission();
    } else {
        //TWO CASE:
        //1. first time - system up - //request window
        if(!PrefUtils.hasLocationPermissionBeenRequested(mActivity)){
            PrefUtils.markLocationPermissionBeenRequested(mActivity, true);                     requestPermission();
        }else{
            //2. second time - user denied with never ask - go to settings                     promptSettings();
        }
    }
    return;
}
{% endhighlight %}

That's all.

# Pre marshmallow and code reuse

To make it work with pre marshmallow, we could encapsulate those logic in a helper.
So in helper, we could specify a general callback for affirmative actions. On pre marshmallow, you could just call that callback; on marshmallow, do permission flow:

{% highlight java %}
public class PermissionHelper {

    public interface PermissionAffirmativeCallback
    {

        public void onPermissionConfirmed();
    }
    
    private PermissionAffirmativeCallback mAffirmativeCallback;

    public static PermissionHelper permissionHelper(PermissionType type,
                                                        Activity activity,
                                                        PermissionAffirmativeCallback callback){
            return new PermissionHelper(type, activity, callback);
        }

    public PermissionHelper(PermissionType type, Activity activity, PermissionAffirmativeCallback callback) {

        if(type == PermissionType.LOCATION){
            mManifestPersmission = Manifest.permission.ACCESS_FINE_LOCATION;
            mRequestCode = PERMISSIONS_REQUEST_LOCATION;
            mDeniedMsg = "Without this permission the app is unable to find your location.Are you sure you want to deny this permission?";
            mDeniedNeverAskTitle = "Unable to locate your position";
            mDeniedNeverAskMsg = "You have denied the permission for location access. Please go to app settings and allow permission";
        }else if(type == PermissionType.CALL){
            mManifestPersmission = Manifest.permission.CALL_PHONE;
            mRequestCode = PERMISSIONS_REQUEST_CALL_PHONE;
            mDeniedMsg = "Without this permission the app is unable to make call.Are you sure you want to deny this permission?";
            mDeniedNeverAskTitle = "Unable to make call";
            mDeniedNeverAskMsg = "You have denied the permission for calling.. Please go to app settings and allow permission";
        }
        this.mActivity = activity;
        this.mAffirmativeCallback = callback;
        checkPermission();
    }
    

    private void checkPermission() {
       if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
           int permerssion = ActivityCompat.checkSelfPermission(mActivity, mManifestPersmission);               
           boolean should = ActivityCompat.shouldShowRequestPermissionRationale(mActivity, mManifestPersmission);               
           if (permerssion != PackageManager.PERMISSION_GRANTED) {
               //...blablabla
               return;
           }
       }

       if(this.mAffirmativeCallback != null){
           this.mAffirmativeCallback.onPermissionConfirmed();
       }
   }
   //others
}               
{% endhighlight %}


Then in activity, you could use like this way:
{% highlight java %}
public class MainActivity extends AppCompatActivity {
    protected List<PermissionHelper> mPermissionHelpers = new ArrayList<>();
    
    @Override
    public void onRequestPermissionsResult(int requestCode,
                                             String permissions[], int[] grantResults) {
      for(PermissionHelper helper : mPermissionHelpers){
          helper.onRequestPermissionsResult(requestCode,permissions, grantResults);
      }
    }
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        mToolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(mToolbar);
        
        PermissionHelper permissionHelper = PermissionHelper.permissionHelper(PermissionType.LOCATION, this,
                   new PermissionHelper.PermissionAffirmativeCallback() {
                       @Override
                       public void onPermissionConfirmed() {
                           renderMap();
                       }
                   });
        mPermissionHelpers.add(permissionHelper);
        
        permissionHelper = PermissionHelper.permissionHelper(PermissionType.CALL, this,
        new PermissionHelper.PermissionAffirmativeCallback() {
            @Override
            public void onPermissionConfirmed() {
                makeCall();
            }
        });
        mPermissionHelpers.add(permissionHelper);        
    }
}
{% endhighlight %}


There you go.

Full code on gist: [https://gist.github.com/tuo/2ee5de2a03e04b48b79b](https://gist.github.com/tuo/2ee5de2a03e04b48b79b)