# Android Developer Tooling

Arcs supports a Websocket based channel that passes messages from the Arcs Storage Stack to a client.
Follow the steps below to setup DevTols in your application.

## 1. Add the DevToolsService to your Application

To enable DevTools, you need to include and start the DevTools foreground service in your app. 
The first step is to add the `INTERNET` and `FORGROUND_SERVICE` android permissions to your
`AndroidManifet.xml` file as shown below:

```
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
```

Next, you need to add `//java/arcs/android/devtools` and `//java/arcs/android/devtools:aidl`
dependencies to your build file.

Finally, create an `Intent` and start the service as shown below.

```
val devToolsIntent = Intent(this, DevToolsService::class.java)
startForegroundService(devToolsIntent)
```

Once `startForegroundService` is called, the DevToolsService will connect to the Arcs
StorageService and begin sending messages to your client.

For an example of DevToolsService you can checkout the [E2E TestApp.](https://github.com/PolymerLabs/arcs/tree/master/javatests/arcs/android/e2e/testapp)

## 2. Port Forwarding and Server Setup

Once you have installed your app with DevTools service, you need to setup port forwarding by running:

```
adb forward tcp:12345 tcp:33317
```

To view messages coming across, start running a local server by running:

```
tools/sigh devServer
```

## 3. View Messages

You can view the messages sent from the DevToolsService by opening http://localhost:8786/devtoolsNG/basic/index.html
