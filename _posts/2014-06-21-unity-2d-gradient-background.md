---
layout: post
title: "Unity 2D Gradient Background Transition"
date: 2014-06-21 13:31:22 +0800
tags: #unity #graident #shader
---


When develop 2D games in Unity, sometime we want to make some transition on day-night cycle(e.g. sky color change)

So I have one design for start state of dawn like following: 

![dawn start sky color](https://cloud.githubusercontent.com/assets/491610/3633961/ba10f934-0f08-11e4-9f9c-77c34bdbe32c.png)

(bottom color: fe805e, top: 527fc1)

and the end state of dawn: 

![dawn end sky color](https://cloud.githubusercontent.com/assets/491610/3633960/ba1003d0-0f08-11e4-8e5b-2b5d8c4f9393.png)

(bottom color: fa8856, top: 7ae0ec)

The final effect should be like this: 

![transition](https://cloud.githubusercontent.com/assets/491610/3633977/61552796-0f0a-11e4-80ea-f96b879c48ec.gif)

## Graident

To achieve the gradient background, we need to apply a new gradient shader. The shader would accept one main texture, and two colors.


{% highlight csharp %} 
Shader "Custom/Gradient" {
Properties {
	[PerRendererData] _MainTex ("Sprite Texture", 2D) = "white" {}
    _Color ("Bottom Color", Color) = (1,1,1,1)
    _Color2 ("Top Color", Color) = (1,1,1,1)
    _Scale ("Scale", Float) = 1
}
 
SubShader {
    Tags {"Queue"="Background"  "IgnoreProjector"="True"}
    LOD 100
 
    ZWrite On
 
    Pass {
        CGPROGRAM
        #pragma vertex vert  
        #pragma fragment frag
        #include "UnityCG.cginc"
 
        fixed4 _Color;
        fixed4 _Color2;
        fixed  _Scale;
 
        struct v2f {
            float4 pos : SV_POSITION;
            fixed4 col : COLOR;
        };
 
        v2f vert (appdata_full v)
        {
            v2f o;
            o.pos = mul (UNITY_MATRIX_MVP, v.vertex);
            o.col = lerp(_Color,_Color2, v.texcoord.y );
//            o.col = half4( v.vertex.y, 0, 0, 1);
            return o;
        }
       
 
        float4 frag (v2f i) : COLOR {
            float4 c = i.col;
            c.a = 1;
            return c;
        }
            ENDCG
        }
    }
}

{% endhighlight %} 

Then create a material with that shader and assign the mat to sprite render, finally in script:

{% highlight csharp %} 
sRender.material.SetColor("_Color", Color.black); // the bottom color
sRender.material.SetColor("_Color2", Color.white); // the top color
{% endhighlight %} 	


## Transition

{% highlight csharp %} 

private float duration = 1.0f;
	public SpriteRenderer sRender;
	// Update is called once per frame
	Color HexToColor(string hex)
	{
		byte r = byte.Parse(hex.Substring(0,2), System.Globalization.NumberStyles.HexNumber);
		byte g = byte.Parse(hex.Substring(2,2), System.Globalization.NumberStyles.HexNumber);
		byte b = byte.Parse(hex.Substring(4,2), System.Globalization.NumberStyles.HexNumber);
		return new Color32(r,g,b, 255);
	}


	void Update () {
		float lerp = Mathf.PingPong(Time.time, duration) / duration;
		sRender.material.SetColor("_Color", Color.Lerp(HexToColor("fe805e"),HexToColor("fa8856"),  lerp)); //bottom
		sRender.material.SetColor("_Color2", Color.Lerp(HexToColor("527fc1"),HexToColor("7ae0ec"),  lerp)); //top
	}
{% endhighlight %} 	



