# Arcs Android demo app

A work-in-progress demo app for running Arcs on Android.

## Installation instructions:

(Sorry, there's a lot to do...)

1. Install bazel
2. Install Android Studio
3. In Android Studio, install the Android SDK
4. Add `export ANDROID_HOME="path/to/your/android/sdk"` to your `.bashrc` file
5. In Android Studio's AVD Manager, create a new Android emulator
6. Run `bazel mobile-install //src/main:app`
7. Optional: install the Bazel plugin for Android Studio

