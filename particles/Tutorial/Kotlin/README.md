# Hello, World!
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
    override fun getTemplate(slotName: String) = "<b>Hello, world!</b>"
}

// Here is the boilerplate to ensure a function to instantiate a particle is
// available outside the wasm modue.
@Retain
@ExportForCppRuntime("_newHelloWorldParticle")
fun constructHelloWorldParticle() = HelloWorldParticle().toWasmAddress()
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

# Template Interpolation Exploration

Alright, you’ve made your first Arcs program. But now it’s time to go make something! We are going to need a few more Arcs features to create anything of substance.

To get started, we want a way to make our UI dynamic. Simply returning static HTML is fairly boring. As with our Hello World program, we use `getTemplate()` to return our base set of HTML, however we want to be able to update this in some way. To do so, we use the `populateModel()` method and template interpolation. To make certain we are all speaking the same language, let’s define template interpolation within Arcs:

> *Template Interpolation* - A mechanism to substitute formatted data into renderable elements.

This interpolation occurs when `populateModel()` returns a dictionary with keys that match elements in the template. The best way to explain how this works is to see it in action. The Arcs manifest file looks pretty much the same as with our Hello World example.

```
particle BasicTemplateParticle in 'BasicTemplate.wasm'
  consume root

recipe BasicTemplateRecipe
  BasicTemplateParticle
  description `Kotlin Tutorial 2: Basic Templates`
```

Meanwhile, the Kotlin looks quite different, as this is where the magic occurs:
```kotlin
// We start with the same package and import information
package arcs.tutorials

import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class BasicTemplateParticle : Particle() {
    // Returns a map that goes from placeholder name to value.
    override fun populateModel(slotName: String, model: Map<String, String>): Map<String, String> {
        return model + mapOf(
            "name" to "Human"
        )
    }

     // You can set placeholders in your template like so: {{name}}. The render
     // function is where these placeholders are overridden.
     // NOTE: Each placeholder needs to be enclosed inside its own HTML element
     // (here, a <span>).
    override fun getTemplate(slotName: String) = "<b>Hello, <span>{{name}}</span>!</b>"
}

@Retain
@ExportForCppRuntime("_newBasicTemplateParticle")
fun constructBasicTemplateParticle() = BasicTemplateParticle().toWasmAddress()
```

Finally, the Bazel BUILD file, which looks nearly identical to the one we used in the hello world program.
```
load("//build_defs:build_defs.bzl", "arcs_kt_binary")

arcs_kt_binary(
    name = "BasicTemplate",
    srcs = ["BasicTemplate.kt"],
)
```

Now your code should say “Hello, Human!”. You can update this by changing what `populateModel()` returns. In upcoming tutorials, we will see how this can be updated based on user input.

# Slots: The root of the matter

But, as promised, let’s get to understanding root. We start with a definition:

> Slots - an element of the Arcs platform that allows particles to render on a user interface. 

As a matter of notation, we say that particles consume slots when they fill a slot, and provide slots when they make slots available to other particles. Particles can also delegate by providing and consuming a slot. Root is the base slot that Arcs provides for particles to use. 

This all is a bit theoretical, so let's get to an example. To show how particles can provide and consume slots, this time we will have two particles.

As usual, we start with the Arcs manifest file:
```
// The "parent" particle. It provides a slot for another particle to render within.
particle ParentParticle in 'ParentParticle.wasm'
  // This particle renders to the root slot ("consumes" it), and provides a slot
  // called "mySlot" in which another particle can render. The
  // child particle will be rendered inside a special div with the identifier
  // "mySlot", which this particle will need to provide in its HTML.
  consume root
    provide mySlot

// The "child" particle. Instead of consuming "root" it consumes "mySlot"
particle ChildParticle in 'ChildParticle.wasm'
  consume mySlot


// Unlike previous recipes, this one includes two particles.
recipe RenderSlotsRecipe
  ParentParticle
    // The ParentParticle consumes root just like particles in previous examples.
    consume root
      // ParentParticle also provides mySlot. Note the additional tab over.
      // The name "slot" is the name the recipe uses for the slot, and is how
      // the recipe connects the parent's mySlot and the child's mySlot
      provide mySlot as slot
  ChildParticle
    // And the ChildParticle consumes the slot.
    consume mySlot as slot

  description `Javascript Tutorial 3: Render Slots`
```

Next, we implement the parent and child particles in Kotlin. To do this, we will create a Kotlin file for each particle as outlined in the Arcs manifest file. We start with the ParentParticle which provides the slot.
```Kotlin
class ParentParticle : Particle() {
    // The parent particle needs to provide a div with slotid "mySlot".
    override fun getTemplate(slotName: String) = "<b>Hello:</b><div slotId=\"mySlot\"></div>"
}

@Retain
@ExportForCppRuntime()
fun _newParentParticle() = ParentParticle().toWasmAddress()
```

The ChildParticle looks nearly identical to the particles we created in our first tutorials.
```Kotlin
class ChildParticle : Particle() {
    override fun getTemplate(slotName: String) = "Child"
}

@Retain
@ExportForCppRuntime()
fun _newChildParticle() = ChildParticle().toWasmAddress()
```

And finally the BUILD file, which is the same as in the previous tutorials, but has a second rule.
```
load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary")

arcs_kt_binary(
    name = "ParentParticle",
    srcs = ["ParentParticle.kt"],
)

arcs_kt_binary(
    name = "ChildParticle",
    srcs = ["ChildParticle.kt"],
)

```

And there you have it! The mystery of root solved, and a basic understanding of slots. Slots are a large part of the power of Arcs to hide user data, so we'll be using them a lot going forward. So don't worry if you don't fully understand them yet, there will plenty more examples to come!

