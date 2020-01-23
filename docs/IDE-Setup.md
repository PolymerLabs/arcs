# IDE Setup

Arcs can be developed in the IDE of your choice. Here are some helpful hints to get started.

## Android Studio

- Install Android Studio. When prompted, install the needed SDK Android 10 (SDK version 29).
- Open Android Studio and install the Bazel extension (Configure > Plugins). This should prompt you to restart the IDE, if not restart anyway.
- Upon restarting Android, click "Import Bazel Project"
- Select the workspace by navigating to the arcs folder, then click "Next".
- Choose "Import project view file" and click on the three dots.
- Navigate to the arcs folder, and select the `as.bazelproject` file. Click "OK".
- Click "Next".
- Click "Finish".
- Install or Update the Kotlin Plugin, at minimum version 1.3+.
  - If installed, update the plugin to the latest version via Tools > Kotlin > Configure Kotlin Plugin Updates. 

## IntelliJ

- Install IntelliJ. Community Edition is sufficient. For web technologies support, install Professional Edition.
- During the setup (within Featured Plugins stage), ensure that Android is enabled.

Set up the IDE with Bazel support
- Open IntelliJ and install the Bazel extension (Configure > Plugins). This should prompt you to restart the IDE, if not restart anyway.
- Upon restarting IntelliJ, click "Import Bazel Project"
- Select the workspace by navigating to the arcs folder, then click "Next".
- Choose "Import project view file" and click on the three dots.
- Navigate to the arcs folder, and select the `ij.bazelproject` file. Click "OK".
- Click "Next".
- Click "Finish".
- Install or Update the Kotlin Plugin, at minimum version 1.3+.
  - If installed, update the plugin to the latest version via Tools > Kotlin > Configure Kotlin Plugin Updates. 

Add Android support
- If you have Android Studio already installed, you may skip the next few steps, as this will be automated.
- Download the [command line tools](https://developer.android.com/studio/#command-tools) for your OS. 
- After extraction, store the `tools` directory in the platform-appropriate location

| OS       | Location  |
| -------- | --------- |
| Linux    | `/home/<USER_NAME>/Android/Sdk` |
| Windows  | `C:\Users\<USER_NAME>\AppData\Local\Android\sdk` |
| MacOS    | `/Users/<USER_NAME>/Library/Android/sdk` |

- Download an SDK using the `sdkmanager` binary in `Android/sdk/tools`:
```
  $ sdkmanager --update
  $ sdkmanager --list
  $ sdkmanager 'platforms;android-29'
```
(If you encounter `"Warning: File ~/.android/repositories.cfg could not be loaded."`, create one with "`touch ~/.android/repositories.cfg`".)
- Within IntelliJ, go to File > Project Structure
- Go to Platform Settings > SDKs
- Click the `+` button, choose Android SDK
- Navigate to the sdk folder that contains the `tools` directory, using the above table. 


## Troubleshooting

#### `Error:Cannot run program "bazel" (in directory "$path"): error=2, No such file or directory`

- Go to your IDE Preferences > Bazel Settings
- Find the Bazel binary location, and click the three dots next to it.
- Navigate to the correct location, and select the Bazel binary.
  - If you don't know where the Bazel binary is located, open a terminal and run `which bazel`.
- Click "Apply" then "OK"
- Re-import the project by hitting the Bazel logo in the upper right hand corner.

#### Android SDK not installed

Android Studio: Follow the prompts and then restart your IDE.
IntelliJ: Follow the above instructions.

#### `arcs/.aswb` or `arcs/.ijwb` already exists

- You may have already imported the project into your preferred IDE. Please try reopening it.
- Optional: Delete the hidden folder and repeat the appropriate steps above.

#### `Typescript is not supported by this IDE`

If web technology support is not needed, choose `.bazelproject` instead of `ij.bazelproject`. If web technologies are needed, consider upgrading to the professional edition of IntelliJ.

#### My OS (read: MacOS) doesn't let me point to the Android SDK / It only displays user created directories

Consider using the [IDE file chooser](https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000128290-Use-IDE-File-Chooser-Rather-Than-Native-One) instead of the native one. 

#### IDE not responding after Bazel Sync

- Try increasing the [memory heap allocation](https://www.jetbrains.com/help/idea/increasing-memory-heap.html). 
- Open the `.bazelproject` file. Comment out the targets or directories that are not relevant to your current task, then re-sync. 

#### IDE shows `Unresolved Reference` for generated entities

- Right click the directory with the BUILD file > Partially Sync <directory-name>/...
- Non-incrementally sync the project: Bazel > Sync > Non-incrementally sync project with BUILD file
- Ensure that your Kotlin plugin is at version 1.3.61 or higher: Preferences > Plugins > Installed > Kotlin 
- Ensure that your IDE is at an recent enough version

| IDE            | Version |
| -------------- | ------- |
| Android Studio | 3.6+    |
| IntelliJ       | TBD     | 

- Ensure that Bazel is version 1.2 (2.0 will cause problems)
- Try Invalidating Caches: File > Invalidate Caches > Invalidate and Restart
- Try [this workaround](https://github.com/bazelbuild/intellij/issues/490#issuecomment-454030118) (1 should be sufficient).

## References

[Bazel integration with IntelliJ documentation](https://ij.bazel.build/)
