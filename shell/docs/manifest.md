# Manifest
An Arcs Manifest declares collections of Schemas, Particles, Recipes and Views. It's used as an input to the system from which suggestions can be produced.

By convention a manifest is stored in a file with the `.manifest` extension.

## Schemas

Schemas define the simple data structure of Entities that are passed via Views
as inputs and outputs of Particles.

```
schema MyThing
  Text someValue
  URL someURL
```

A schema can extend another schema defined or imported into the same manifest.

```
schema YourThing

schema MyThing extends YourThing
  Text myStuff
```

* TODO: normative vs optional
* TODO: value types

## Particles

Particle definitions define the shape of a Particle -- its parameters, the slots
that it provides and consumes and the location of the particle implementation.

```
particle MyParticle in 'my-particle.js'
  MyParticle(in MyThing myinthing, out [MyThing] myoutthing, inout [AnotherThing] anotherthing)
```

### Slots
Particles that produce UI must define which slots they use for rendering. Slots may be declared required or optional. Even if all slots are optional, at least one of them must be provided in order for the particle to be instantiated. Each slot may be consumed by multiple particles.

"root" slot is a special slot that is provided by the system before any of the particles are rendered. If particle renders and creates slots for other particles to use, they are also defined in the manifest. The provided slots may restrict the views to be rendered in the slot. The particle that consumes the provided slot must have the same view bounded as one of its connections.

```
particle MyParticle in 'my-particle.js'
  MyParticle(in MyThing myinthing, out [MyThing] myoutthing)
  must consume mySlot
    provide innerSlot
    provide restrictedInnerSlot
      view myinthing
  consume otherSlot
```

"Set slot" are a special type of slot that is provided for a set view. A separate slot will be created for each individual element in the set view. The consuming particle must be explicitly defined to consume a set slot as well.

```
particle MySetParticle in 'my-set-particle.js'
  MySetParticle(in [MyThing] mything)
  consume mySlot
    provide set of innerSlot

particle MyItemParticle in 'my-item-particle.js'
  MyItemParticle(in [MyThing] mythis)
    consume set of innerSlot
```

### Descriptions
Particle description defines how the Particle is represented in the recipe suggestion text. Description includes a sentence pattern, and optional individual argument descriptions.

```
particle MyParticle in ‘my-particle.js’
  MyParticle(in MyThing mything)
    consume main
      provide secondary
  description `Do Something with ${mything}`
     mything `my special thing`
```

Description may also reference the following details from the view descriptions:
- ```${mything}._type_``` to include the view type (eg MyThing)
- ```${mything}._values_``` to include only the values of the view
- ```${mything}._name_``` to include the view description with no values
- ```${mything.myProperty}``` to include a select property of the view (only supported for singleton views)

or from slot descriptions:
- ```{main.secondary}``` to include the description of a recipe particle that consumes the 'secondary' slot, provided by MyParticle.
- ```{main.secondary}._empty_``` true, if the secondary slot actually consumed to render content.

Only the descriptions of Particles that render UI will be used to construct the suggestion text.

View descriptions may also be used in particles UI (including other particles in the recipe that use the same view). The particle template would contain:
```
<span>{{mything.description}}</span>
```

* TODO: particle JS

## Views

Views contain entities of a particular Schema. There are two kinds of view
instantiations:

* 'set' view: `view MyProducts of [Product] in 'my-products.json'`
* 'variable' view: `view MyProduct of Product in 'my-products.jsoin'`.

Views defined in manifests are immutable. They may be mapped, or copied via a
Recipe into an arc.

Views can contain a simple description:

```
view MyProducts of [Product] in 'my-products.json'
  description `These are some of my favorite things`
```

The JSON file specified contains the contents of the view.

Given the schema:

```
schema Product
  Text name
```

A corresponding JSON file might look like:

```json
[
  {"name": "Pizza"},
  {"name": "A Pony"},
  {"name": "The world's largest Pinata"}
]
```

The JSON representation for a variable view is the same, if the JSON file contains
multiple entities, the first one is used.

* TODO: serialization can specify id and version.

## Recipes
Recipes declare how particles can be wired up to become part of an Arc.

This can be a combination of particles:
```
... // assumes the particles are defined or imported
recipe
  Thinginator
  ThingPresentinator
```

Can include how particle inputs are connected to views:
```
...
recipe
  map as view1               // maps a view external to the arc; changes in the
                             // external view will be reflected locally, but the
                             // local view is read-only.
  use as view2               // uses some view already in the Arc
  create as view3            // creates a new empty view
  copy ImportedView as view4 // creates a new view populated with entries from
                             // a view defined or imported
                             // in the manifest
  SomeParticle
    param1 <- view1  // bind's SomeParticle's 'in' param1 to view1
    param2 -> view2  // binds 'out'
    param3 = view3   // binds 'inout'
```

Can include how particles are connected to slots:
```
...
recipe
  TheirParticle
    provides specialSlot as slot0
  MyParticle
    consumes mySlot as slot0
```

## Importing other manifests
A manifest can be self contained or can import Schemas, Particles, Recipes and Views from other manifest files.

```
# By relative path:
import '../somewhere/another.manifest'
# Or URL
import 'https://fancy-thing.glitch.io/everything.manifest'
```

Everything in the heirarichy of imported manifests is then made available in the manifest scope.

## Indentation
Indentation is significant. It is used to group blocks of manifest items together. The indentation rules require that items at the same level have the same indentation. By convention this is usually in increments of two spaces.

```
recipe
  SomeParticle
  AnotherParticle
YetAnotherPartilce  // This is an error, it should have been indented
                    // as the previous lines.
```

## Comments
Comments are inserted by prefixing the comment with `//`.

```
// this is a comment
recipe
  // so is this
  SomeParticle
```

## Scoping
Items in a manifest are named. Item names are specified in `UpperCamel`.

```
recipe MyRecipe
particle MyParticle
view MyView
schema MySchema
schema mySchema  // This is an invalid name.
```

Particle and view definitions can refer to Schemas (defined or imported) by name:
```
schema MySchema
particle MyParticle
  MyParticle(in MySchema)      // uses the schema defined above
view MyView of [MySchema] ...  // again, uses the schema defined above
```

Recipes can refer to particles and views by name:
```
...
recipe
  map MyView  // 'MyView' could be is defined in this manifest or imported
  MyParticle  // 'MyParticle' could be is defined in this manifest or imported
```

Within a recipe; views, particles, and slots can be given 'local names'. Local names are scoped to the recipe:

```
...
recipe
  map MyView as view0  // establishes a mapped view with a local name of `view0`
  MyParticle
    param1 <- view0  // refers to the view mapped above by local name
```

* TODO: serialization can refer to items external to the manifest by 'id'.
