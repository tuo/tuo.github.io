--- 
layout: post
title: "Android listview remember selection and set default selection"
category: android
published: true
---
From an iOS developer's perspective, I find that it is extremely hard to apply features like "**set default selection when starting**" and "**remember selection status after user clicked row**" to ListView. 
  
  So let's start with **"remember selection"** first.The problem is that even if you know that 
you can use selector xml to define highlight/pressed/focus style.But that style will not 
be kept after user clicked that row. For instance, I have a highlighting selector xml (list_selector.xml under res/drawable folder) like this (but you may have other fields need to highlight like text color of textview in row):
{% highlight xml%}
<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@drawable/list_selector_pressed" 
		android:state_pressed="true" />
    <item android:drawable="@drawable/list_selector_pressed" 
		android:state_selected="true" />
</selector>    
{% endhighlight %}
and list_selector_pressed.xml which defined the highlighting style--set the background color
to a gray color :
{% highlight xml%}
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape xmlns:android="http://schemas.android.com/apk/res/android">
            <solid android:color="@color/dark_gray" />
        </shape>
    </item>
</layer-list>
{% endhighlight %}
So as @David Hedlund suggested:

> Rather, assign an OnItemClickListener, and have it store away the id of the selected item into some variable. 

you need to create a instance variable on top of your class:
{% highlight java%}
        private View currentSelectedView;
{% endhighlight %}
then go to 
{% highlight java%}
@Override
public void onListItemClick(ListView l, View v, int position, long id) {
	if (currentSelectedView != null && currentSelectedView != v) {
        unhighlightCurrentRow(currentSelectedView);
    }

	currentSelectedView = v;
    highlightCurrentRow(currentSelectedView);
    //other codes 
    }
{% endhighlight %}
Pretty simple: we check if currentSelectedView is null or current clicked view or not. we first to unhighlight any style by calling method unhighlightCurrentRow(currentSelectedView)---you may wonder why we pass instant variable currentSelectedView as parameter, I will explain it later.  Then we assign view to currentSelectedView and highlight current row; so that the style will persist after user's clicking is done.

{% highlight java %}
private void unhighlightCurrentRow(View rowView) {
    rowView.setBackgroundColor(Color.TRANSPARENT);
    TextView textView = (TextView) rowView.findViewById(R.id.menuTitle);
    textView.setTextColor(getResources().getColor(R.color.white));
}

private void highlightCurrentRow(View rowView) {
    rowView.setBackgroundColor(getResources().getColor(
            R.color.dark_gray));
    TextView textView = (TextView) rowView.findViewById(R.id.menuTitle);
    textView.setTextColor(getResources().getColor(R.color.yellow));

} 
{% endhighlight %}

 Aha, that's it. That is how we implement "remember selection" for list view. As you see, 
we have to duplicate the codes for styling both in xml and java code--pretty stupid :(




**Next about "set default selection"**. You may think that you can do this 
{% highlight java %}
	listView.setAdapter(adatper)
	listView.setSelection(0);
	currentSelectedView = listView.getChildAt(0);
	highlightCurrentRow(currentSelectedView);
{% endhighlight %}	
in onCreate() in activity or onActivityCreated() in fragment.     
But if you run it , you will get NullPointer exception and why ?
because at this time, the listview is not rendered yet and Android doesn't like iOS which have viewWillAppear. SO you have to create an instant variable to remember whether it is first time to render listview cell and in onListItemClick to unset that variable:

So under currentSelectedView declaration:
{% highlight java %}
    private Boolean firstTimeStartup = true;
{% endhighlight %}
then add methods : suppose we want to highlight the first row in list view:

{% highlight java %}
public class HomeAdapter extends ArrayAdapter<String> {
	int layoutResourceId;

	public HomeAdapter(Context context, int textViewResourceId,
			ArrayList<String> objects) {
		super(context, textViewResourceId, objects);
		layoutResourceId = textViewResourceId;
	}

	@Override
	public View getView(int position, View convertView, ViewGroup parent) {
		if (convertView == null) {
			convertView = LayoutInflater.from(getContext()).inflate(
					layoutResourceId, null);
		}

		if (firstTimeStartup && postion == 0) {
            highlightCurrentRow(convertView);
        } else {
            unhighlightCurrentRow(convertView);
        }

		TextView title = (TextView) convertView
				.findViewById(R.id.menuTitle);
		title.setText(getItem(position));
		return convertView;
	}
}
{% endhighlight %}
Pretty simple.
But you need to make some changes in onListItemClick method:
{% highlight java %}
@Override
public void onListItemClick(ListView l, View v, int position, long id) {

	if (firstTimeStartup) {// first time  highlight first row
		currentSelectedView = l.getChildAt(0);
	}
	firstTimeStartup = false; 
	if (currentSelectedView != null && currentSelectedView != v) {
        unhighlightCurrentRow(currentSelectedView);
    }

	currentSelectedView = v;
    highlightCurrentRow(currentSelectedView);

     //other codes
}
{% endhighlight %}

There you go! Enjoy Android :)
