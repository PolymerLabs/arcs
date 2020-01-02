# IDE Setup

Arcs can be developed in the IDE of your choice. Here are some helpful hints to get started in some more common IDEs.

## Android Studio

- Install Android Studio. When prompted, install the needed SDK Android 10 (SDK version 29).
- Open Android Studio and install the Bazel extension. This should prompt you to restart the IDE, if not restart anyway.
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
- During the setup (within Featured Pluggins stage), ensure that Android is enabled.

Set up the IDE with Bazel support
- Open IntelliJ and install the Bazel extension (Configure > Plugins)
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

- Within IntelliJ, go to File > Project Structure
- Go to Platform Settings > SDKs
- Click the `+` button, choose Android SDK
- Navigate to the sdk folder that contains the `tools` directory, using the above table. 


## Troubleshooting

#### `Error:Cannot run program "bazel" (in directory "$path"): error=2, No such file or directory`

- Go to your IDE Preferences -> Bazel Settings
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

#### `Cannot run program "bazel" (in directory "..."): error=2, No such file or directory`

- Determine where the Bazel binary is location (`which bazel`).
- Settings > Other Settings > Bazel Settings > Bazel binary location = /path/to/your/bazel

#### `Typescript is not supported by this IDE`

If web technology support is not needed, choose `.bazelproject` instead of `ij.bazelproject`. If web technologies are needed, consider upgrading to the professional edition of IntelliJ.

#### My OS (read: MacOS) doesn't let me point to the Android SDK / It only displays user created directories

Consider using the [IDE file chooser](https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000128290-Use-IDE-File-Chooser-Rather-Than-Native-One) instead of the native one. 

#### IDE not responding after Bazel Sync

- Try increasing the [memory heap allocation](https://www.jetbrains.com/help/idea/increasing-memory-heap.html). 
- Open the `.bazelproject` file. Comment out the targets or directories that are not relevant to your current task, then re-sync. 

#### IDE shows `Unresolved Reference` for generated entities

- Try Invalidating Caches: File > Invalidate Caches > Invalidate and Restart
- Try [this workaround](https://github.com/bazelbuild/intellij/issues/490#issuecomment-454030118) (1 should be sufficient).

## References

[Bazel integration with IntelliJ documentation](https://ij.bazel.build/)
