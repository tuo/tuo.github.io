--- 
layout: post
title: "iOS解决CSV文件的中文编码问题"
category: iOS
published: true
---

## 起因

&nbsp;&nbsp;&nbsp;&nbsp;最近一次iOS项目中需要按照CSV格式拼装字符串然后添加到邮件作为附件。但是在这个过程我遇到两个很常见的问题：CSV格式和non-ascii编码及BOM(Byte Order Mark)字节顺序标记。
 
##CSV格式##
这个比较棘手过程开始于：因为将要发送的CSV字符串中有中文符号（数据统计相关的东西），所以我需要支持unicode编码。
<br/>
当然最简单的实现方式是:
{% highlight objectivec %}	
MFMailComposeViewController *emailComposer = [[MFMailComposeViewController alloc] init];	 
NSMutableString *csvString = [NSMutableString string];
[csvString appendString:@"姓名,性别,体重,创建时间\n"];
NSString *timestamp = [dateFormatter stringFromDate:[NSDate date]];
[csvString appendString:[NSString stringWithFormat:@"%@,%@,%@,%@\n", @"黄拓", @"男", @"65 kg", timestamp]];
[csvString appendString:[NSString stringWithFormat:@"%@,%@,%@,%@\n", @"詹姆斯", @"女", @"25 kg", timestamp]];	
[picker addAttachmentData:[csvString dataUsingEncoding:NSUTF8StringEncoding]  mimeType:@"text/csv" fileName:@"statistics.csv"];
{% endhighlight %}	
<br/>
我们创建了一个*MFMailComposeViewController*实例，然后以逗号作为分隔符，'\n'作为换行标记来拼接我们的CSV字符串。在最后，我们设置数据的编码为*NSUTF8StringEncoding*.没什么特别的。
<br/>
**然后你迫不及待的从邮箱中下载打开CSV文件，但是发现却是一坨乱码！ **
<br/>
分隔符貌似没有效果，所有的数据都挤在了一个格子里，而且只有一行。

#####修复

很简单的一个修复办法是将逗号替换为tab('\t')，并且将换行符替换为'\r\n'.如果你不这么做，它就没办法工作。 @_@
<br/>
下面是一个修复的版本：
{% highlight objectivec %}		
MFMailComposeViewController *emailComposer = [[MFMailComposeViewController alloc] init];	 
 NSMutableString *csvString = [NSMutableString string];
[csvString appendString:@"姓名\t性别\t体重\t创建时间\r\n"];
NSString *timestamp = [dateFormatter stringFromDate:[NSDate date]];
[csvString appendString:[NSString stringWithFormat:@"%@\t%@\t%@\t%@\r\n", @"黄拓", @"男", @"65 kg", timestamp]];
[csvString appendString:[NSString stringWithFormat:@"%@\t%@\t%@\t%@\r\n", @"詹姆斯", @"女", @"25 kg", timestamp]];	
[picker addAttachmentData:[csvString dataUsingEncoding:NSUTF8StringEncoding]  mimeType:@"text/csv" fileName:@"statistics.csv"];
{% endhighlight %}		
	
现在你重新试一下，会发现格式已经正确了，有正确的格子数和行数。	
<br/>
**新的问题是： 每个格子的中文都是乱码？**
![乱码](/static/images/20130118/1.png)
	 
##Non-ASCII编码以及BOM##

要解决这些乱码问题，首先我们需要指导为什么我们可以通过向CSV文件的头部插入BOM的方式来消除乱码？长话短说，就是它一个让文件接收方知道发送方使用了何种Unicode编码方式的标记，所以通过它我们可以正确的解析字符流。
<br/>
通过[BOM Wiki](http://en.wikipedia.org/wiki/Byte_order_mark)，我们指导utf-8的十六位表示是"EF BB BF". 接着我们可以将其添加到CSV字符串的头部，
然后特别需要的是将编码格式从utf-8改为utf-16，否则中文将无法正常显示。

下面是最终代码：
{% highlight objectivec %}	
NSMutableString *csvString = [NSMutableString string];
[csvString appendString:@"姓名\t性别\t体重\t创建时间\r\n"];
NSString *timestamp = [dateFormatter stringFromDate:[NSDate date]];
[csvString appendString:[NSString stringWithFormat:@"\xEF\xBB\xBF%@\t%@\t%@\t%@\r\n", @"黄拓", @"男", @"65 kg", timestamp]];
[csvString appendString:[NSString stringWithFormat:@"\xEF\xBB\xBF%@\t%@\t%@\t%@\r\n", @"詹姆斯", @"女", @"25 kg", timestamp]];
 NSString *sourceString = [[NSString alloc] initWithFormat:@"\xEF\xBB\xBF%@", csvString];
NSData *encodedData = [sourceString dataUsingEncoding:NSUTF16StringEncoding allowLossyConversion:YES];
[picker addAttachmentData:encodedData mimeType:@"text/csv" fileName:@"statistics.csv"];
{% endhighlight %}	

你可以很奇怪，我们应该只需要在头部添加BOM标记就好啦， 为什么每一行内容都需要添加这个标记？
具体原因我无法解释，但是如果不加了，那么显示一行可能没问题，但是如果一旦显示超过四五行的内容，就会出现奇怪的乱码。   
![乱码](/static/images/20130118/2.png)  


<br/>
Okay 搞定!