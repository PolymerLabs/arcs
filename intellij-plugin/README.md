# Arcs IntelliJ Plugin

An IntelliJ plugin supporting Arcs manifests (*.arcs files).

## For Users

1) Either follow the _For Developers_ workflow below or run `./gradlew buildPlugin` in this directory.

2) Install the plugin from build/distributions/arcs_gradle_plugin-1.0.zip

3) That's it! (You can stop reading now.)

## For Developers

1) Install IntelliJ

2) From IntelliJ, import this directory as a Gradle Project.

3) Start developing with the instructions from https://www.jetbrains.org/intellij/sdk/docs/reference_guide/custom_language_support.html.

- Use :runIde to start another IntelliJ instance to test the plugin.
- Use :buildPlugin to build the shippable version of the plugin which will be 
  located under build/distributions.



