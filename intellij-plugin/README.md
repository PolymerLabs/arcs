# Arcs IntelliJ Plugin

An IntelliJ plugin supporting Arcs manifests (*.arcs files).

## For Users

1) Either follow the _For Developers_ workflow below or run `./gradlew buildPlugin` in this directory.

2) Open up Settings panel in Intellij or Android Studio.

![File > Settings](images/settings.png)

3) Select Plugin section, select "Install Plugin from Disk...".

![Plugins > Install Plugin from Disk...](images/plugin_from_disk.png)

4) Select `build/distributions/arcs_gradle_plugin-1.0.zip`.

## For Developers

1) Install IntelliJ

2) Install plugin: Grammar-Kit, which will generate a set of contextual actions
when IntelliJ opens *.bnf files and *.flex files.

3) From IntelliJ, import this directory as a Gradle Project.

4) Open Arcs.bnf, click Tools->Generate Parser Code. Then open Arcs.flex,
click Tools->Run JFlex Generator. After this, you will see generated codes under
src/main/gen.

5) Open the *Gradle* subpanel from the right side panel. You will see a set of
Gradle actions:
- Use :runIde to start another IntelliJ instance to test the plugin.
- Use :buildPlugin to build the shippable version of the plugin which will be
  located under build/distributions.

6) Start developing with the instructions from https://www.jetbrains.org/intellij/sdk/docs/reference_guide/custom_language_support.html.

