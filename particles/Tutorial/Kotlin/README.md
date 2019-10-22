Welcome to developing using Arcs! By using Arcs as the platform for your system, you are choosing to value user sovereignty and leverage AI.  To get started, please obtain the project through [Github](https://github.com/PolymerLabs/arcs) using the instructions available there. For debugging purposes, we highly recommend having the [Arcs Explorer Chrome Extension](https://github.com/PolymerLabs/arcs/tree/master/devtools) also installed.

Before we get to code, it is important that we are all speaking the same language, so we present two definitions to start.

>- *Particle* - Modular component of functionality. Ideally small units so particles can be reusable. 
>- *Recipe* - A combination of particles to create features and systems.

Particles and recipes are defined using the Arcs Manifest Language and implemented in Javascript, Kotlin, or C++.  The best way to understand this is to jump into some code. Let’s look at how Hello World is implemented.

To start off with, we’re going to need two files, an Arcs manifest file (.arcs file) and a particle implementation in your language of choice. It’s easiest if we create a folder to house these files so we don’t lose them. As a matter of convention, particles live in the arcs/particles folder. Go ahead and create a new folder in there called ‘HelloWorld’.

Don’t worry if you don’t understand everything at the moment, we’ll be going over all of this in more detail throughout this tutorial. Let’s walk through these files line by line, starting with the .arcs file. You should create this file in your folder. By convention, .arcs files are camel case, so it should be called `HelloWorld.arcs` or something similar.
```
// The file begins by defining our particle. Based on the file
// path, We can assume the particle is implemented in kotlin.
particle HelloWorldParticle in 'HelloWorld.wasm'
  // Notice the tab that starts this line. Whitespace matters
  // in the Arcs manifest language, so this is very important.
  // Don't worry about what this line does at the moment, we'll
  // be getting to root and slots in more detail soon.
  consume root

// And now we are at the recipe definition!
recipe HelloWorldRecipe
  // Once again, notice the tab. This line tells us that the
  // HelloWorldRecipe contains a HelloWorldParticle.
  HelloWorldParticle
  // Finally, we provide a human readable description for the
  // recipe. This is optional, but will make it much easier and
  // nicer to debug. Once again, notice the tab.
  description `Tutorial 1: Hello World`
```

Alright, we’ve got our Arcs manifest file set. Now onto the Kotlin. Just like the .arcs file, this should be in your HelloWorld folder. We set the file name in the .arcs file above to be `HelloWorld.kt`.

```kotlin
package arcs.tutorials

// We start with the required imports.
import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

// We define the HelloWorldParticle class to be a child
// of the Particle class.
class HelloWorldParticle : Particle() {
    // Set the template to be "Hello, world!" as this is what we want
    // to display.
    override fun getTemplate(slotName: String): String {
        return "<b>Hello, world!</b>"
    }
}

// Here is the boilerplate to ensure a function to instantiate a particle is
// available outside the wasm modue.
@Retain
@ExportForCppRuntime("_newHelloWorldParticle")
fun constructHelloWorldParticle(): WasmAddress = HelloWorldParticle().toWasmAddress()
```

Finally, we need a 'BUILD' file. Arcs particles can be built using Bazel rules. Here's an example Bazel BUILD file for HelloWorld:

```BUILD
// Required imports
load("//build_defs:build_defs.bzl", "arcs_kt_binary")

// Arcs Kotlin particle build rule
arcs_kt_binary(
    name = "HelloWorld",
    srcs = ["HelloWorld.kt"],
)
```
run the build file by running `bazel build particles/HelloWorld:all` from the root arcs folder.

Once you have Arcs on your computer, run `npm start` in command line, then navigate to [http://localhost:8786/shells/dev-shell/?m=https://$particles/HelloWorld/HelloWorld.arcs](http://localhost:8786/shells/dev-shell/?m=https://$particles/HelloWorld/HelloWorld.arcs)

And that’s it! Congratulations, you have written your first program in Arcs!
