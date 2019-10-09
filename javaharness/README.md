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

The javaharness depends on pipes-shell, which needs to be webpacked before the
Java code can be built/run with bazel. Instructions are in `build.sh` (run it
from the repo root):

```bash
./javaharness/build.sh
```

You will need to re-run `build.sh` whenever the Runtime or pipes-shell code
changes. If only the Java has changed, you can just run bazel directly (via
command line or via Android Studio).

## Troubleshooting

* If you see issues about a missing `@androidsdk` repo, you should double-check
  that your `ANDROID_HOME` environment variable is set correctly. You can also
  try running:
  ```bash
  bazel clean --expunge
  ```
* If you see errors concerning `pipes-shell`, make sure you've run `build.sh`,
  and check that the symlink points to the right place.
