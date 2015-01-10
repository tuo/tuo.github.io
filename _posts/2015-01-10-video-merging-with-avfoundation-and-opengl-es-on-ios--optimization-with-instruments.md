---
layout: post
title: "Video Merging with AVFoundation and OpenGL ES on iOS: Optimization With Instruments"
date: 2015-01-10 12:25:44 +0800
published: true
tags: #tags go here: space-separated string
---

Now we have our pretty much all the function working, next we need do some performance optimization.

But first, let's do some testing. By change video from *640x640* to *1280x720*, the reason to choose *1280x720* is the app that we mentioned before [Action Movie FX](https://itunes.apple.com/us/app/action-movie-fx/id489321253?mt=8), is using this resolution for video that it got from camera. Other videos like FX and Alpha we're gonna use *960x720* which is high resolution video the app is gonna use. [All movies](https://github.com/tuo/AVFoundationOpenGLESVideoProcessing/tree/master/ThreeVidoes-Final/movies) are available on github. All movies's duraton is about *5.52* seconds.

**Before** we did any optimization, our project keeps throwing "Low memory warning", and sometimes even crashes. If you wonder how GPUImage performance, well, it just crashes immediately. Obviously this is not acceptable.

**After** optimzation we're gonna do in this article, our project works quite well, no crashes and we got some comparison result:

 * ipod5 - 5.7 seconds, action movie fx - 10.6 seconds

 * iPhone4s - 6.7s ~ 7.380 seconds , action movie fx - 17.28 seconds

 * iPhone4 - 12.0s~13.0s seconds , action movie fx - 36 seconds


|              | AVFoundataion + OpenGL ES | Action Movie FX |
| ------------ | ------------------------- | --------------- |
| iPhone4      | 12.0s ~ 13.0s             | 36.1s           |
| iPhone4S     | 6.7s  ~ 7.38s             | 17.28s          |
| iPod5        | 5.7s                      | 10.6s           |


<br/>
As you see, it is actually quite big difference out there!

The complete code is on the github: [ThreeVidoes-Final](https://github.com/tuo/AVFoundationOpenGLESVideoProcessing/tree/master/ThreeVidoes-Final). You're free to download and try it.


# OpenGL ES Analyzer
<hr/>

Apple has a great documentation covered this topic: [Tuning Your OpenGL ES App](https://developer.apple.com/library/ios/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/Performance/Performance.html).

Open XCode, try **"Product -> Profile"**, select **OpenGL ES Analyzer** in instruments dialog, then click run button in top left part of instrument.


Here is the result we got:

![instrument_openglesanalyzer_result](https://cloud.githubusercontent.com/assets/491610/5690507/de0b583a-98c8-11e4-988d-5465152803c7.png)


We could list all those points:

    1. Redudant Call
    2. Recommend Using VBO
    3. Unitialized Texture Data
    4. Logical Buffer Store
    5. CPU wait on GPU for Finish
    6. Draw Call Accessed Vertex Attributes
    7. Recommend Using VAO
    8. Logic Buffer Load


From my knowledge, I will start with **Recommend Using VBO** and **Recommend Using VAO** first, as it is easier to start with. Another reason is that other points like *Unitialized Texture Data* and *CPU wait on GPU for Finish* are not quite important or deliberately left like that. Well, *Logic Buffer Load* and *Logical Buffer Store* to be honest, I'm not quite sure what they are about and I hope someone could share some light on it :)

# Recommend Using VBO
<hr/>

In VideoWriter, here is the current implementation in **kickoffRecording** method:

{% highlight objectivec %}

glViewport(0, 0, (int)self.videoSize.width, (int)self.videoSize.height);
//use shader program
NSAssert(_program, @"Program should be created");
glUseProgram(_program);


// This needs to be flipped to write out to video correctly
static const GLfloat squareVertices[] = {
        -1.0f, -1.0f,
        1.0f, -1.0f,
        -1.0f,  1.0f,
        1.0f,  1.0f,
};

static const GLfloat textureCoordinates[] = {
        0.0f, 0.0f,
        1.0f, 0.0f,
        0.0f, 1.0f,
        1.0f, 1.0f,
};
//https://developer.apple.com/library/ios/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html
glVertexAttribPointer(_positionSlot, 2, GL_FLOAT, 0, 0, squareVertices);
glVertexAttribPointer(_srcTexCoord1Slot, 2, GL_FLOAT, 0, 0, textureCoordinates);
glVertexAttribPointer(_srcTexCoord2Slot, 2, GL_FLOAT, 0, 0, textureCoordinates);
glVertexAttribPointer(_srcTexCoord3Slot, 2, GL_FLOAT, 0, 0, textureCoordinates);

//bind uniforms
...
glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
glFinish();

{% endhighlight %} 	


Well, how do we use VBO? What's VBO?

VBO, according to [Vertex Buffer Objects](http://en.wikipedia.org/wiki/Vertex_Buffer_Object):

>  A Vertex Buffer Object (VBO) is an OpenGL feature that provides methods for uploading vertex data (position, normal vector, color, etc.) to the video device for non-immediate-mode rendering. VBOs offer substantial performance gains over immediate mode rendering primarily because the data resides in the video device memory rather than the system memory and so it can be rendered directly by the video device.


Also, Apple has a great article on it: [Best Practices for Working with Vertex Data](https://developer.apple.com/library/ios/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html), which also covers VBO and VAO that we'gonna talk later.

If you feel still it is little bit hard to understand it, and it would be great it has some demo/example code along it, RayWenderlich has a greate blog on it: [OpenGL Tutorial for iOS: OpenGL ES 2.0](http://www.raywenderlich.com/3664/opengl-tutorial-for-ios-opengl-es-2-0).

Okay, let's start coding by declaring some constants and struts:

{% highlight objectivec %}

typedef struct {
    GLfloat position[2];
    GLfloat texcoord[2];
} Vertex;

const Vertex Vertices[] = {
        { { -1, -1 }, { 0, 0}}, //bottom left
        { {1, -1 }, {1, 0}},  //bottom right
        { {-1, 1 }, {0, 1}}, //top left
        { {1, 1 }, {1, 1}}   //top right
};

const GLubyte Indices[] = {
        0, 1, 2,
        2, 1, 3
};

{% endhighlight %} 	


Then we create *setupVBO* method in initial setup code:


{% highlight objectivec %}
- (void)setupVBOs {
    glGenBuffers(1, &vertexBuffer);
    glBindBuffer(GL_ARRAY_BUFFER, vertexBuffer);
    glBufferData(GL_ARRAY_BUFFER, sizeof(Vertices), Vertices, GL_STATIC_DRAW);
    glBindBuffer(GL_ARRAY_BUFFER, 0);

    glGenBuffers(1, &indexBuffer);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indexBuffer);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(Indices), Indices, GL_STATIC_DRAW);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);
}
{% endhighlight %} 	


Finally in kick off video writing method:

{% highlight objectivec %}
glViewport(0, 0, (int)self.videoSize.width, (int)self.videoSize.height);
//use shader program
NSAssert(_program, @"Program should be created");
glUseProgram(_program);


glBindBuffer(GL_ARRAY_BUFFER, vertexBuffer);
glVertexAttribPointer(_positionSlot, 2, GL_FLOAT, GL_FALSE,
        sizeof(Vertex), 0);

glVertexAttribPointer(_srcTexCoord1Slot, 2, GL_FLOAT, GL_FALSE,
        sizeof(Vertex), (GLvoid*) (sizeof(float) * 2));
glVertexAttribPointer(_srcTexCoord2Slot, 2, GL_FLOAT, GL_FALSE,
        sizeof(Vertex), (GLvoid*) (sizeof(float) * 2));
glVertexAttribPointer(_srcTexCoord3Slot, 2, GL_FLOAT, GL_FALSE,
        sizeof(Vertex), (GLvoid*) (sizeof(float) * 2));

//bind uniforms
...

glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indexBuffer);
glDrawElements(GL_TRIANGLE_STRIP, sizeof(Indices)/sizeof(GLubyte), GL_UNSIGNED_BYTE, 0);

{% endhighlight %} 	

That's all for using VBO to improve the vertex performance. Nothing fancy.

Run the code to make sure everything still works.

# Recommend Using VAO
<hr/>

Cool, we already implemented the vertex buffer objects, but that's not the end. We could keep going by introducing [VAO](https://developer.apple.com/library/ios/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html)([Vertex Array Objects](https://www.opengl.org/wiki/Vertex_Specification#Vertex_Array_Object)).


Remove the **setupVBO** method and add a new method **setupVAO**:

{% highlight objectivec %}
//setup vertex array object for better performance as the position/texcoordiates are same
- (void)setupVAO {

    //create and bind a vao
    glGenVertexArraysOES(1, &vertextArrayObject);
    glBindVertexArrayOES(vertextArrayObject);

    //create and bind a BO for vertex data
    glGenBuffers(1, &vertexBuffer);
    glBindBuffer(GL_ARRAY_BUFFER, vertexBuffer);

    // copy data into the buffer object
    glBufferData(GL_ARRAY_BUFFER, sizeof(Vertices), Vertices, GL_STATIC_DRAW);

    // set up vertex attributes
    glEnableVertexAttribArray(_positionSlot);
    glVertexAttribPointer(_positionSlot, 2, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void*)offsetof(Vertex, position));
    glEnableVertexAttribArray(_srcTexCoord1Slot);
    glVertexAttribPointer(_srcTexCoord1Slot, 2, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void*)offsetof(Vertex, texcoord));


    // Create and bind a BO for index data
    glGenBuffers(1, &indexBuffer);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indexBuffer);

    // copy data into the buffer object
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(Indices), Indices, GL_STATIC_DRAW);

    //unbind it, rebind it only when you needed
    glBindVertexArrayOES(0);
}

{% endhighlight %} 

Then we need to slightly modify the code in rendering: 

{% highlight objectivec %}

glViewport(0, 0, (int) self.videoSize.width, (int) self.videoSize.height);
//use shader program
NSAssert(_program, @"Program should be created");
glUseProgram(_program);
glBindFramebuffer(GL_FRAMEBUFFER, _frameBuffer);

// This is it. Binding the VAO again restores all buffer
// bindings and attribute settings that were previously set up
glBindVertexArrayOES(vertextArrayObject);

//Bind uniforms
...

glDrawElements(GL_TRIANGLES, sizeof(Indices) / sizeof(GLubyte), GL_UNSIGNED_BYTE, (void *) 0);
glFinish();


{% endhighlight %} 	


There you go. Run the code to see any differences. Now you have finished vertex optimization, and no more warning in instruments and it got much faster.


#Conclusion
<hr/>
This is the last article in this series.

I have done other cleanup also. But for other points it listed from instruments, I dont' quite understand how to improve it. I help someone could share some experience on it and make it better.






    