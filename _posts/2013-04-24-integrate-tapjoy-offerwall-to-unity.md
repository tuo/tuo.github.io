---
layout: post
title: "Integrate Tapjoy Offerwall To Unity"
date: 2013-04-24 22:25:09 +0800
published: true
tags: #tags go here: space-separated string
---

Recently I need to integrate Tapjoy offerwall into app for non-Chinese users in Unity. Well after taking a look at the Tapjoy offerwall documentation, I downloaded the sdk and am about to integrate into unity project. But during that, I just ran into tons of problems.

##Walkthrough
So basically I have a script *CurrencyManager* in my project, which is attached to an non-empty and non-destroyable *GameObject*- in my case its name is *CurrencyManager*. What basically Currency Manager is doing is that it stores everything about points like spend points,award points and query points. Nothing special. And it has couples of instance variables like *totalPoints*,*spentPoints* and *awardedPoints* to track points locally and synchronize with remote offerwall service provider's server(here is tapjoy backend). It is interesting as according to Tapjoy documentation:
>Tapjoy managed currency enables you to use Tapjoy's servers to store your user's currency amount.

What it says it that Tapjoy is gonna save total points,spent points and awarded points in backend. That means you need to maintain synchronization of points between local and remote. As sometimes,network is not available and user's any operation on points will not be synchronized to remote tapjoy backend immedidately, and when network is available later, those points should be synchronized properly. And Tapjoy is in charge of everthing about points, it has a setting in admin panel that deal with amount of points you want to give to new user(first install) and configure Conversion rate and add test devices.

Here is simplified version of CurrencyManager.cs :

{% highlight csharp %} 

public enum OfferWallType
{
	Youmi,Tapjoy
}
public class CurrencyManager : MonoBehaviour
{
	public static OfferWallType offerWallType;	
	private static CurrencyManager _instance;	
	private OfferwallBase _offerwallService;
	  	
	public void init()
	{				 		
		if(CurrencyManager.offerWallType == OfferWallType.Youmi){
			_offerwallService = (Youmi) gameObject.AddComponent(typeof(Youmi));
		}else{
			_offerwallService = (TapJoy) gameObject.AddComponent(typeof(TapJoy));
		}
	}
		
	public void showOffers()
	{
		_offerwallService.ShowOffers();
	}
		
	public void syncPoints()
	{
		bool spentORaward = false;
		if(spentPoints > 0)
		{
			_offerwallService.SpendPoints(spent￿s);			
			spentORaward = true;
		}
		
		if(awardedPoints > 0)
		{
			_offerwallService.AwardPoints(awardedPoints);			
			spentORaward = true;
		}
		
		//if no spent or award, query points
		if(!spentORaward)
		{
			queryPoints();
		}
		
	}
	
	public void pointsAward(int value)
	{
		awardedPoints += value;
		syncPoints();
	}
	
	public void pointsSpend(int value)
	{
		spentPoints += value;
		syncPoints();
	}
	
	public void queryPoints()
	{
		if(Configuration.isDevice())
		{
			_offerwallService.GetPoints();						
		}	
	}
	
 	public void showEarnedPoints()
	{
		if(Configuration.isDevice())
		{
			_offerwallService.ShowEarnedPoints();
		}
	}
	
	private bool _totalPointsChanged;
	private int _totalPoints;
	public int totalPoints
	{
		get{
			if(_totalPointsChanged)
			{
				_totalPointsChanged = false;
				 
				 //You mean need to encrypt the value before save
				if(PlayerPrefs.HasKey(PREFS_TOTAL))
				{
					_totalPoints = int.Parse(Parse(PlayerPrefs.GetString(PREFS_TOTAL));
				}
				else
				{
					_totalPoints = 0;
				}	
			}
			
			return (_totalPoints + awardedPoints - spentPoints);
		}
		
		set{
			_totalPointsChanged = true;
            PlayerPrefs.SetString(PREFS_TOTAL_HEARTS, value.ToString());
		}
	}
	
	//..do similiar setup for awaredPoints and spentPoints setter and getter
	 
}

{% endhighlight %} 

CurrencyManager is pretty flexible as you can add other offerwall services quite easily to the code(Like here we also implement YouMi). The method worth pointing out is that for totalPoints,awaredPoints and spentPoints, the setter is gonna actually save points locally and getter is loading points from PlayerPrefs. So that we don't rely on backend to track points. And everytime you award/spend points, it is gonna trigger syncPoints() to sync local points to tapjoy services.

Of course, our CurrencyManager is singleton.

Here is the tapjoy code:

{% highlight csharp %}

public class TapJoy : OfferwallBase
{	 
	void Start()
	{		
		TapjoyPlugin.SetCallbackHandler("CurrencyManager");
		
		TapjoyPlugin.EnableLogging(true); //for testing
		TapjoyPlugin.RequestTapjoyConnect(Configuration.TAPJOY_APP_ID, Configuration.TAPJOY_SECRET);
		TapjoyPlugin.SetTransitionEffect((int)TapjoyTransition.TJCTransitionExpand);		 		 
	}
	 
	public override void ShowOffers()
	{
		TapjoyPlugin.ShowOffers();
	}

	public override void SpendPoints(int points)
	{
		TapjoyPlugin.SpendTapPoints(points);			
	}
	
	public override void AwardPoints(int points)
	{
		TapjoyPlugin.AwardTapPoints(points);
	}

	
	public override void GetPoints()
	{
		TapjoyPlugin.GetTapPoints();
	}


	public override void ShowEarnedPoints()
	{
		TapjoyPlugin.ShowDefaultEarnedCurrencyAlert();
	}

	#region Tapjoy Callback Methods (These must be implemented in your own c# script file.)
	// CONNECT
	public void TapjoyConnectSuccess(string message)
	{
		Debug.Log("HandleTapjoyConnectSuccess");
	}
	
	public void TapjoyConnectFail(string message)
	{
		Debug.Log("HandleTapjoyConnectFailed");
	}
	
	// VIRTUAL CURRENCY
	public void TapPointsLoaded(string points)
	{
		Debug.Log("HandleGetTapPointsSucceeded: " + points);
		CurrencyManager.getInstance().totalPoints = int.Parse(points);
	}
	Point
	public void TapPointsLoadedError(string message)
	{
		Debug.Log("HandleGetTapPointsFailed" + message);
	}
	
	public void TapPointsSpent(string points)
	{
		Debug.Log("HandleSpendTapPointsSucceeded: " + points);
		CurrencyManager.getInstance().spentPoints = 0;
		CurrencyManager.getInstance().totalPoints = int.Parse(points);
	}

	public void TapPointsSpendError(string message)
	{
		Debug.Log("HandleSpendTapPointsFailed " + message);
	}

	public void TapPointsAwarded(string points)
	{		 
		Debug.Log("HandleAwardTapPointsSucceeded " + points );		 
		CurrencyManager.getInstance().awardedPoints = 0;
		CurrencyManager.getInstance().queryPoints();
	}

	public void TapPointsAwardError(string message)
	{
		Debug.Log("HandleAwardTapPointsFailed");
	}
	 
	public void CurrencyEarned(string points)
	{ 
 		Debug.Log("CurrencyEarned" + points ); 
 		TapjoyPlugin.ShowDefaultEarnedCurrencyAlert();	}

	#endregion
}

{% endhighlight %} 

Nothing special, we just followed official sample code and the documentation [Tapjoy Integrating the Offerwall](https://knowledge.tapjoy.com/en/integration/integrating-the-offerwall). And the Tapjoy class here is like composition, just hide complexity of code that acutally deal with tapjoy. 

Here is the thing you may wonder why *CurrencyEarned* is not called. The trick is that after you set *TapjoyPlugin.SetCallbackHandler*, everytime response from tapjoy backend like queryPoints or awardPoints, the tapjoy is pretty smart to check whether it is necessary to call *CurrencyEarned* or not.


##Problem
Okay, so you have all the code ready and can't wait to build out xcode project and run it on your device. Oh, before you test it, don't forget to set *Init Balance* and add your device to *Test Devices*, which first one will give you init points and second one will you make your testing way easier.

You launch the app and open offerwall, click *Test Offer (Click to receive 10 points)* in the first row and press home button and open you app again, you will see an alert : *Congratulations! You've just earned 10 Points!*.  Perfect! Everything looks good. 

**Then where is problem I'm gonna talk about?**

Here for a typical game, you have a collectable items in gameplay.Like here we have collectable item when user is playing the game, and user can just pick up the item and their points in lower-left corner will be increased by one. Well user definitely will pick up the item, then after 2 or 3 seconds, BANG, you got an alert view saying *Congratulations! You've just earned 1 Points!*. And you lose the control of the game, until you press the *OK* button of alert view.  Then maybe your lovely character is already dead by hitting to rock or stepped on by Chuck Norris. So you may be wondering WTF!


##Solution
You may think that we can do a check in method *CurrencyEarned*

{% highlight csharp %}

public void CurrencyEarned(string points)
{ 
	Debug.Log("CurrencyEarned" + points ); 
	TapjoyPlugin.ShowDefaultEarnedCurrencyAlert();
}
	

{% endhighlight %} 
	
by checking like GameState, normally game will have following states: None, Playing,Pause, Continue, GameOver.
Then how about adding following check ?

{% highlight csharp %}

public void CurrencyEarned(string points)
{ 
	Debug.Log("CurrencyEarned" + points ); 
	if(GameManager.GameState == None || GameManager.GameState == GameOver)
	{
		TapjoyPlugin.ShowDefaultEarnedCurrencyAlert();
	}		
}

{% endhighlight %} 	
	
Here for our case is even tricky as we also show it not only when game scene not started/loaded also when it is gameover.

But then we have another problem, it is that character right before it is dead, it pick up a point power-up item. Then you will an alert view saying *Congratulations! You've just earned 1 Points!*. Again, you need to press *OK* button to dismiss it. You may think this case it is pretty rare but when your game has millions users. It is not a neglectable issue.

Let's revisit the logic. So basically we only want *CurrencyEarned* be triggered when user lanunch the app. And during the gameplay, we dont' want it get called. 

Maybe we can set a flag like *enabled* on like *TapjoyEarnedPointManager*, which should be a singleton. Then in *AppController.mm* go to *- (void) applicationDidBecomeActive:*, check currently enabled offerwall services first and see if it is Tapjoy enabled, then calling *[TapjoyEarnedPointManager sharedInstance].enabled = TRUE*.

Then go to Mono and find your *UnityInterface.cs* wrapper-which contains all your unity-objectivec magic method delcarations. Add following codes:

{% highlight csharp %}

[DllImport("__Internal")]
public static extern bool Plugin_IsOfferWallCheckPointsTriggered();
public static bool IsOfferWallCheckPointsTriggered()
{
	if(Configuration.isDevice())
	{
		return Plugin_IsOfferWallCheckPointsTriggered();
	}
	return false;
}

[DllImport("__Internal")]
public static extern void Plugin_SetOfferWallCheckPointsTriggeredToFalse();
public static void SetOfferWallCheckPointsTriggeredToFalse()
{
	if(Configuration.isDevice())
	{
		Plugin_SetOfferWallCheckPointsTriggeredToFalse();
	}
}

{% endhighlight %} 

And in your unity interface navtive code somewhere add implmenetations:

{% highlight csharp %}
	  
  ...
    bool Plugin_IsOfferWallCheckPointsTriggered()
    {
        return ([TapjoyEarnedPointManager sharedInstance].enabled)
         
    }
    
    void Plugin_SetOfferWallCheckPointsTriggeredToFalse()
    {
    	[TapjoyEarnedPointManager sharedInstance].enabled = NO;
    }
    
	
#ifdef __cplusplus
}
#endif

{% endhighlight %} 

Finally go to your *Tapjoy.cs* and locate *CurrencyEarned*, change it to following:

{% highlight csharp %}

public void CurrencyEarned(string points)
{ 
	
	if(UnityInterface.IsOfferWallCheckPointsTriggered())
	{
		UnityInterface.SetOfferWallCheckPointsTriggeredToFalse();
		//it may have network delay and you actually now is playing it, don't alert under that case
		if(GameManager.GameState == None || GameManager.GameState == GameOver)
		{
			TapjoyPlugin.ShowDefaultEarnedCurrencyAlert();
		} 	

	}else{
		Debug.Log("Currencty Earned IsOfferWallCheckPointsTriggered is false, not show it");
	}
}	

{% endhighlight %} 

Build and run it. It should slove previous problem perfectly. 

Yup!

##References

[Tapjoy Offerwall Unity Plugin](https://knowledge.tapjoy.com/en/integration/unity-plugin) 

[Tapjoy Integrating the Offerwall](https://knowledge.tapjoy.com/en/integration/integrating-the-offerwall)

[Tapjoy Managed Currency](https://knowledge.tapjoy.com/en/integration/managed-currency)
