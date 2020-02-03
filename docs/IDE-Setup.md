# IDE Setup

Arcs can be developed in the IDE of your choice. Here are some helpful hints to get started.

## Android Studio

1. [Install Android Studio](https://developer.android.com/studio/index.html). When prompted, install the needed SDK Android 10 (SDK version 29).

1. Open Android Studio and install the Bazel extension (`Configure > Plugins`). This should prompt you to restart the IDE, if not restart anyway.

1. Upon restarting Android, click "Import Bazel Project"

1. Select the workspace by navigating to the arcs folder, then click "Next".

1. Choose "Import project view file" and click on the three dots.

1. Navigate to the arcs folder, and select the `as.bazelproject` file. Click "OK".

1. Click "Next".

1. Click "Finish".

1. Install or Update the Kotlin Plugin, at minimum version 1.3+.
  - If installed, update the plugin to the latest version via `Tools > Kotlin > Configure Kotlin Plugin Updates`. 

## IntelliJ

[Install IntelliJ](https://www.jetbrains.com/idea/download/). Community Edition is sufficient. For web technologies support, install Ultimate Edition.
  - During the setup (within Featured Plugins stage), ensure that Android is enabled.

### Add Bazel support

1. Open IntelliJ and install the Bazel extension (`Configure > Plugins`). This should prompt you to restart the IDE, if not restart anyway.

1. Upon restarting IntelliJ, click "Import Bazel Project"

1. Select the workspace by navigating to the arcs folder, then click "Next".

1. Choose "Import project view file" and click on the three dots.

1. Navigate to the arcs folder, and select the `ij.bazelproject` file. Click "OK".

1. Click "Next".

1. Click "Finish".

1. Install or Update the Kotlin Plugin, at minimum version 1.3+.
  - If installed, update the plugin to the latest version via `Tools > Kotlin > Configure Kotlin Plugin Updates`. 

### Add Android support

If you have Android Studio already installed, you may skip the next few steps, as this will be automated.

1. Download the [command line tools](https://developer.android.com/studio/#command-tools) for your OS. 

2. After extraction, store the `tools` directory in the platform-appropriate location

| OS       | Location  |
| -------- | --------- |
| Linux    | `/home/<USER_NAME>/Android/Sdk` |
| Windows  | `C:\Users\<USER_NAME>\AppData\Local\Android\sdk` |
| MacOS    | `/Users/<USER_NAME>/Library/Android/sdk` |

3. Download an SDK using the `sdkmanager` binary in `Android/sdk/tools`:
```
  $ sdkmanager --update
  $ sdkmanager --list
  $ sdkmanager 'platforms;android-29'
```
(If you encounter `"Warning: File ~/.android/repositories.cfg could not be loaded."`, create one with "`touch ~/.android/repositories.cfg`".)

4. Within IntelliJ, go to `File > Project Structure`

5. Go to `Platform Settings > SDKs`

6. Click the `+` button, choose `Android SDK`

7. Navigate to the sdk folder that contains the `tools` directory, using the above table. 

## Visual Studio Code

TBD

## Troubleshooting

#### `Error:Cannot run program "bazel" (in directory "$path"): error=2, No such file or directory`

1. Go to your IDE `Preferences > Bazel Settings`

1. Find the Bazel binary location, and click the three dots next to it.

1. Navigate to the correct location, and select the Bazel binary.
  - If you don't know where the Bazel binary is located, open a terminal and run `which bazel`.

1. Click "Apply" then "OK"

1. Re-import the project by hitting the Bazel logo in the upper right hand corner.

#### Android SDK not installed

Android Studio: Follow the prompts and then restart your IDE.
IntelliJ: Follow the above instructions.

#### `arcs/.aswb` or `arcs/.ijwb` already exists

You may have already imported the project into your preferred IDE. Please try reopening it.

Optional: Delete the hidden folder and repeat the appropriate steps above.

#### `Typescript is not supported by this IDE`

If web technology support is not needed, choose `.bazelproject` instead of `ij.bazelproject`. If web technologies are needed, consider upgrading to the ultimate edition of IntelliJ.

#### My OS (read: MacOS) doesn't let me point to the Android SDK / It only displays user created directories

Consider using the [IDE file chooser](https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000128290-Use-IDE-File-Chooser-Rather-Than-Native-One) instead of the native one. 

#### IDE not responding after Bazel Sync

- Try increasing the [memory heap allocation](https://www.jetbrains.com/help/idea/increasing-memory-heap.html). 
- Open the `.bazelproject` file. Comment out the targets or directories that are not relevant to your current task, then re-sync. 

#### IDE shows `Unresolved Reference` for generated entities

Assumptions: 
- Your Kotlin plugin is at version 1.3.61 or higher: Preferences > Plugins > Installed > Kotlin 
- Your IDE is at an recent enough version

| IDE            | Version |
| -------------- | ------- |
| Android Studio | 3.5+    |
| IntelliJ       | TBD     | 

- Bazel is version 1.2 (2.0+ may cause problems)

Verified Fixes:
- Local solution: Right click the directory with the BUILD file > Partially Sync <directory-name>/...
- Global solution: Non-incrementally sync the project: `Bazel > Sync > Non-incrementally sync project with BUILD file`
- Note: This works because the project may require two builds or syncs in order to "warm up" the generated sources. 
  
Hail-Mary Fixes:
- Try Invalidating Caches: `File > Invalidate Caches > Invalidate and Restart`
- Try [this workaround](https://github.com/bazelbuild/intellij/issues/490#issuecomment-454030118) (1 should be sufficient).

#### Bazel cannot read environment variables

- Workaround: Launch your IDE from the command line

| OS      | Command                                                  |
| ------- | -------------------------------------------------------- |
| Linux   | `/opt/android-studio-stable/bin/studio.sh`               |
| Windows | TBD                                                      |
| MacOS   | `/Applications/Android Studio.app/Contents/MacOS/studio` |

- Create a `~/.xsesssionrc` file with the following contents:
  ```
  if [ -f ~/.profile ]; then
       . ~/.profile
  fi
  ```
  Please subsitute `.profile` (or repeat) with either `.bash_profile` or `.bashrc` --
  wherever you have vital environment variables.
  After, log out and log back in to your system.

- Otherwise, try one of these [workarounds](https://youtrack.jetbrains.com/issue/IDEABKL-7589).

#### `.../arcs/WORKSPACE:33:1: //external:android/sdk depends on @androidsdk//:sdk in repository @androidsdk which failed to fetch. no such package '@androidsdk//': Either the path attribute of android_sdk_repository or the ANDROID_HOME environment variable must be set.`

Follow [these steps](https://github.com/PolymerLabs/arcs/blob/master/docs/IDE-Setup.md#bazel-cannot-read-environment-variable).

#### `Error:(15, 1) Couldn't build file path/to/file/ParticleName_GeneratedSchemas.jvm.kt: error executing shell command: '/bin/bash -c bazel-out/k8-fastbuild/bin/path/to/file/ParticleName_genrule_jvm.sh' failed (Exit 127)`

Follow [these steps](https://github.com/PolymerLabs/arcs/blob/master/docs/IDE-Setup.md#bazel-cannot-read-environment-variable).

#### `node: not found` or `tsc: not found`

Follow [these steps](https://github.com/PolymerLabs/arcs/blob/master/docs/IDE-Setup.md#bazel-cannot-read-environment-variable).


## References

[Bazel integration with IntelliJ documentation](https://ij.bazel.build/)
