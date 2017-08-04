# Getting Started: Hello, World!

**Code:** https://github.com/PolymerLabs/arcs-demos

In this section we will go through a "Hello, World!" Arcs example to illustrate the basic Arcs concepts of particles and recipes.

In Arcs, a particle is a simple program that contains a bit of JavaScript and a manifest file that describes what the particle does. A particle has a verb, can have inputs and outputs and may render UI to interact with the user. Arcs particles - potentially written by many different authors - can be combined and composed into Arcs recipes that perform a higher-level assistive function for the user. In our example the "Hello, World!" recipe combines together three particles to greet the user:



*   The *HelloWorld* particle has no input and no UI. It simply outputs an entity of type "Message" that holds the greeting message: "Hello, World!".
*   The *Greet* particle takes as input a singleton of type Message and renders it in the DOM.

These two particles would be enough to display a simple "Hello, World!" message. To demonstrate how particles can be used to compose UI, without needing to know about each other, we introduce a third particle:



*   The *PersonalGreet *particle takes as input a singleton of type Person and displays a personal greeting message that gets composed into the DOM output from the previous Greet particle.

Every recipe runs inside an Arc. The Arc contains one or more recipes (the code and data flow) and views (the data) that get mapped into the Arc from the user's context (universe of all available data to the Arcs runtime).

When the demo is loaded, the Arcs runtime does the following:



*   Create a new Arc for the demo.
*   Insert a Person entity named "Claire" into the Arc's context.
*   Add the "Hello, World!" recipe to the Arc.

<table>
  <tr>
   <td>

<img src="images/demo.gif" width="" alt="alt_text" title="image_tooltip">

   </td>
   <td>Once the Arc is set up, the DEMO will suggest the "Hello, World!" recipe to the user by rendering a suggestion in toast at the bottom of the screen. The recipe gets suggested to the user because all of the inputs and UI affordance required for the recipe to run are available.
<p>
Clicking on the suggestion runs all the particles in the recipe and renders their output in the main UI slot. A UI slot corresponds to a named DOM element that particles may render content into. In this example the Greet particle renders a green <code><div></code> into the main Arcs UI slot called "root".
<p>
This recipe includes a simple illustration of particle composition: the Greet particle exposes a UI slot called "customgreeting" for another particle to render UI into. The PersonalGreet particle expects a "customgreeting" UI slot to be available and renders a yellow <code><div></code> into that slot.
<p>
Note that these two particles don't need to know about each other (however they both know about the "customgreeting" slot) and would typically be written by different developers.
   </td>
  </tr>
</table>


You can [run the demo](https://arcs-demos-hello-world.glitch.me/) and even [edit the demo](https://glitch.com/edit/#!/arcs-demos-hello-world) hosted on Glitch. In the following sections we pull the demo apart and describe the different parts of the demo in more detail.


## Demo Setup

The demo consists of a bit of boilerplate HTML and JavaScript code to setup the Arcs demo environment. The [index HTML file](https://github.com/PolymerLabs/arcs-demos/blob/master/hello-world/index.demo.html) includes the Arcs library (arcs.js) and the Web Worker entry point (worker-entry.js) responsible for particle isolation and renders the <demo-flow> web component. The [demo JavaScript file](https://github.com/PolymerLabs/arcs-demos/blob/master/hello-world/demo.js) implements <demo-flow> and sets up a single Arc to run the recipe and greet the user.

Eventually, Arcs will be spawned automatically based on user context. In the demo, the Arc is explicitly instantiated with a single view containing one entity of type Person (named Claire). The demo also explicitly adds the "Hello, World!" recipe to that demo Arc which is also something that Arcs will eventually do automatically.


## Recipes

The recipe declares the particles that constitute (and run as part of) the program as well as how data flows through the particles in the Arc. The recipe description is simply a manifest file loaded by the Arcs demo. Eventually, recipes could be hosted anywhere on the web and get crawled and indexed by Arcs. The same manifest format is used to describe entity schemas (data), particles (code) and recipes (data flow).

For the demo we have four different manifest files. One for every particle and one that pulls it all together and describes the recipe. Let's look at the higher-level recipe manifest first.


```
TODO: show new format recipe manifests for the demo. As of now, recipes are coded in JavaScript. See hello-world.js.
```


The recipe lists all of the particles running in the demo and declares how data flows between these particles by connecting views and UI slots. E.g., the HelloWorld particle outputs a Message named "hello" and Greet takes in a Message named "message". The recipe will declare that the output of HelloWorld should flow into the input of Greet. Note that Greet doesn't know of the existence of HelloWorld. It doesn't care where the message is coming from.


```
HelloWorld(out Message hello)
Greet(in Message message)
```


The demo only uses singleton views. Arcs also supports set views, e.g., ShowProductList(in [Product] products). See [view.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/view.js) for a complete description of the view interface.


## Slots

Slots are named UI placeholders where particles can render content into. E.g., the demo script exposes a root slot that the Greet particle renders into.

Slots are also the mechanism by which UI composes in Arcs. E.g., the Greet particle renders DOM inside the root slot and exposes a new slot for another particle to render additional content into its DOM. The Greet DOM output contains the following tag: `<div slotid="customgreeting"></div>`. The PersonalGreet particle can then specify in its manifest that it wants to be rendered into the 'customgreeting' slot.

TODO: describe more complex slot composition (e.g., interleaved lists). 


## Particles

A particle is the basic unit of computation in Arcs. Simply put it's a JavaScript file that contains a class that inherits either from [DomParticle](https://github.com/PolymerLabs/arcs/blob/master/runtime/dom-particle.js) (if the particle renders DOM UI) or from its parent class [Particle](https://github.com/PolymerLabs/arcs/blob/master/runtime/particle.js) (if it only operates on input and output views).


```
TODO: show the basic new format particle manifest and link to the spec.
```


Particles may gain access to sensitive user data through input views. To avoid data leaks and protect user privacy, particles run isolated from other particles and have limited capabilities. Particles don't have direct access to traditional storage, DOM or even network resources. Instead, particles may have side effects by writing to output views or by rendering (sanitized) DOM content into UI slots. The Arcs runtime is responsible for instantiating particles inside the Arc and for persisting views across ephemeral particle invocations.

Particle authors can write to output views that behave as sets of entities ([interface definition](https://github.com/PolymerLabs/arcs/blob/master/runtime/view.js)). An example of that is the HelloWorld particle that writes to a singleton output view (which is essentially a set of size 1) called hello of type Message:


### Code


```
HelloWorld.js
```


Particles may also output DOM UI. Particles that output any DOM have to inherit from DomParticle. E.g., Greet takes as input a singleton view of type Message and renders that message to DOM.


### Code


```
Greet.js.
```


It's important to note that DOM particles *don't* have unrestricted access to the main DOM. That would give particle authors a way to leak sensitive user data. Instead, DOM particles render templated shadow DOMs into slots that get sanitized before being rendered into the main DOM by the Arcs runtime. As of now, DomParticle templates support the following features:



*   innerHTML substitution. E.g., <span>{{name}}</span>.
*   Attribute substitution. E.g., <span class="{{class}}"></span>.
*   Basic event handling. E.g., <button on-click="_onChooseValue">ClickMe</button>. The sanitizer will substitute on-foo with onfoo before rendering the element to DOM. Event handlers take two arguments: (event:{?}, state:particle state).
*   TODO: describe more complex attribute substitution (%= and $=).

The Arcs library also includes various web components to allow more complex features such as rendering a list of templated content. A complete list of supported web components can be found [here](https://github.com/PolymerLabs/arcs/tree/master/runtime/browser/lib).

