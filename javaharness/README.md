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
   * Project view: from project view file: `javaharness/.bazelproject`
1. Add a new run configuration of type Bazel Command, with command
   `mobile-install` and target expression:
   `//javaharness/java/arcs/android/demo/app:app`

Before this will actually work, you will need to build pipes-shell

## Building

The javaharness depends on pipes-shell and the Arcs runtime, which need to be
webpacked before they can be used by the Android app. Thankfully bazel will
automatically re-run webpack for you whenever those sources change. All you need
to do is run the usual bazel mobile-install command (or build in Android Studio)
and everything that needs to be rebuilt should be.

## Troubleshooting

* If you see issues about a missing `@androidsdk` repo, you should double-check
  that your `ANDROID_HOME` environment variable is set correctly. You can also
  try running:
  ```bash
  bazel clean --expunge
  ```
