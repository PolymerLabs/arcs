## Arcs Android API

TODO: This code is undergoing refactoring, add packages descriptions, when complete.

## Setting up Android Studio

1. Install Android Studio with Bazel support
1. In Android Studio, install the Android SDK (API level 29) using the SDK
   manager.
1. Edit your `.bashrc` to set the `ANDROID_HOME` environment variable to the
   path of your SDK, e.g.:
   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"
   ```
1. Create a new Android device in the AVD Manager (use the same API level as
   above).
1. Create a new bazel project in Android Studio, using the following paths:
   * Workspace: Arcs repo root
   * Project view: from project view file: `as.bazelproject`
1. Add a new run configuration of type Bazel Command, with command
   `mobile-install` and target expression:
   `//java/arcs/sdk/android/dev/service/demo:demo`

Before this will actually work, you will need to build pipes-shell

## Building

The Dev service depends on pipes-shell and the Arcs runtime, which need to be
webpacked before they can be used by the Android app. Thankfully bazel will
automatically re-run webpack for you whenever those sources change. All you need
to do is run the usual ./tools/bazelisk mobile-install command (or build in Android Studio)
and everything that needs to be rebuilt should be.

## Troubleshooting

* If you see issues about a missing `@androidsdk` repo, you should double-check
  that your `ANDROID_HOME` environment variable is set correctly. You can also
  try running:
  ```bash
  ./tools/bazelisk clean --expunge
  ```

## Debugging and Inspection
The Arcs Local Development Server (ALDS) is used to proxy messages between
the device and the host for developers to debug and inspect Arcs via either the Chrome
inspection (chrome://inspect) or the Arcs Explorer (https://live.arcs.dev/devtools/).

Follow the steps to inspect and debug Arcs:
1. Shutting down the old Arcs demo application before configuring new settings:
* ```bash
  adb wait-for-device root
  adb shell killall -9 arcs.android.demo
  ```
2. Starting the ALDS at the root of Arcs repository:
* ```bash
  tools/sigh devServer
  ```
3. Configuring reverse-socket on the device to forward messages to the host:
* ```bash
  adb wait-for-device root
  adb reverse tcp:8786 tcp:8786
  ```
4. Instructing the on-device Arcs runtime to connect to the Arcs Explorer tool:
* ```bash
  adb shell setprop debug.arcs.runtime.enable_arcs_explorer true
  ```
5. Launching the demo activity i.e. Autofill by pressing the Autofill button at the demo application.
* > The button pressing starts the on-device Arcs runtime, connecting to the host ALDS then launching the demo activity.
  > `'Device connected'` should appear on the host console if the connection was established successfully.
6. Debugging and inspecting the started Arcs by navigating to `chrome://inspect` then inspecting the `'Arcs'` tab at the remote target.
* > `'Explorer connected'` should appear on the host console if the connection was established successfully.
  > `Note: Please load and ensure the Arcs Explorer Devtools extension in place`

  > Alternatively using the live Arcs Explorer by opening the link at the Chrome browser:
  ```
  https://live.arcs.dev/devtools/
  ```

> Re-visiting all steps if the device reboots.

## Loading particles and recipes from the workstation
Particles and recipes are by default loaded from the APK, but you can configure the device to load them from you workstation instead:

1. Ensure you have ALDS running and can connect to it by following steps 2 and 3 from the Debugging and Inspection section.
1. Ask for the assets to be loaded from the workstation:
```bash
  adb shell setprop debug.arcs.runtime.load_workstation_assets true
```

## The Arcs Cache Manager
The Arcs Cache Manager compiles javascript and webassembly sources eagerly and caches the compiled binaries at local storage to serve subsequent requests. Page loading time and compilation overhead are optimized when enabled.

Enabling the Arcs Cache Manager:
1. Terminate the existing demo application.
1. Activate the Arcs Cache Manager then launch demo application to reflect new settings.
* ```bash
  adb shell "setprop debug.arcs.runtime.use_cache_mgr true"
  adb shell "setprop debug.arcs.runtime.shell_url 'https://appassets.androidplatform.net/assets/arcs/index.html?'"
  ```
Disabling the Arcs Cache Manager:
1. Terminate the existing demo application.
1. Deactivate the Arcs Cache Manager then launch demo application to reflect new settings.
* ```bash
  adb shell "setprop debug.arcs.runtime.use_cache_mgr false"
  adb shell "setprop debug.arcs.runtime.shell_url 'file:///android_asset/arcs/index.html?'"
  ```

## Properties
Android properties are used to change and tweak Arcs settings at run-time.

| Property | Description | Default |
| -------- | ----------- | ------- |
| debug.arcs.runtime.log | Change logging level of the JS Arcs runtime | 2 (the most verbose) |
| debug.arcs.runtime.enable_arcs_explorer | Connect to the Arcs Explorer frontend via ALDS proxy while starting the JS Arcs runtime | false |
| debug.arcs.runtime.dev_server_port | The port to use for communication with ALDS | 8786 |
| debug.arcs.runtime.shell_url | Specify which shell to use | https://appassets.androidplatform.net/<br/>assets/arcs/index.html? (on-device pipes-shell with the Arcs Cache Manager) |
| debug.arcs.runtime.load_workstation_assets | Whether to load recipes and particles from the workstation | false (assets from the APK) |
| debug.arcs.runtime.use_cache_mgr | Whether to use the Arcs Cache Manager | true
| debug.arcs.runtime.systrace | Specify system tracing channel (options: [android,console]) | n/a (trace off)
| debug.arcs.runtime.use_worker_pool | Whether to use the Arcs Worker Pool | true
| debug.arcs.runtime.worker_pool_options| Provide additional worker pool configurations | "nosuspend"
| debug.arcs.runtime.sizing_policy | Select worker pool dynamic sizing (shrink/grow) policy | default
