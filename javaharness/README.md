## Arcs Android API

TODO: This code is undergoing refactoring, add packages descriptions, when complete.

Note there are symbolic links between pipes-shell and
the outer shells/pipes-shell directory, that means the pipes-shell
must be build first.

## Preparing The Environment
First, ensure xcode + command lines tools are installed.  
Install the Android SDK (API level 29) using the SDK manager in the Android Studio.  
Export the ANDROID_HOME environment variable at ~/.bashrc as  
`export ANDROID_HOME=<ANDROID SDK Location>`  
Run `install_dependencies.sh` to insure Bazel and iBazel are installed.  
Run `tools/sigh` build and `shells/pipes-shell/web/deploy/deploy.sh` at the root of arcs repository.  

## Building
Build out an Android demo app by:  
`./build.sh`

## Running
Start Android Emulator and run:  
`bazel mobile-install //javaharness/java/arcs/android/demo/app:app`  
