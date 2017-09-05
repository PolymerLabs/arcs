# Manifest
An Arcs Manifest declares collections of Schemas, Particles, Recipes and Views. It's used as an input to the system from which suggestions can be produced.

By convention a manifest is stored in a file with the `.manifest` extension.

## Schemas

Schemas define the simple data structure of Entities that are passed via Views
as inputs and outputs of Particles.

```
schema MyThing
  normative
    Text someValue
  optional
    URL someURL
```

A schema can extend another schema defined or imported into the same manifest.

```
schema YourThing

schema MyThing extends YourThing
  optional
    Text myStuff
```

* TODO: normative vs optional
* TODO: value types

## Particles

Particle definitions define the shape of a Particle -- its parameters, the slots
that it provides and consumes and the location of the particle implementation.

```
particle MyParticle in 'my-particle.js'
  MyParticle(in MyThing, out [MyThing], inout [AnotherThing])
```
* TODO: slots
* TODO: descriptions
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
  optional Text name
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
... # assumes the particles are defined or imported
recipe
  Thinginator
  ThingPresentinator
```

Can include how particle inputs are connected to views:
```
...
recipe
  map as view1               # maps some external view
  use as view2               # uses some view already in the Arc
  create as view3            # creates a new view
  copy ImportedView as view4 # creates & copies from a view defined or imported
                             # in the manifest
  SomeParticle
    param1 <- view1 # bind's SomeParticle's 'in' param1 to view1
    param2 -> view2 # binds 'out'
    param3 = view3  # binds 'inout'
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
YetAnotherParitlce # This is an error, it should have been indented
                   # as the previous lines.
```

## Comments
Comments are inserted by prefixing the comment with `#`.

```
# this is a comment
recipe
  # so is this
  SomeParticle
```

Confusingly we also use `#` to insert 'tags'. There will be a breaking change in the future when one of these is changed.

```
recipe
  SomeParticle #ThisIsATag # but... this is a comment. Oops.
```

## Scoping
Items in a manifest are named. Item names are specified in `UpperCamel`.

```
recipe MyRecipe
particle MyParticle
view MyView
schema MySchema
schema mySchema # This is an invalid name.
```

Particle and view definitions can refer to Schemas (defined or imported) by name:
```
schema MySchema
particle MyParticle
  MyParticle(in MySchema)     # uses the schema defined above
view MyView of [MySchema] ... # again, uses the schema defined above
```

Recipes can refer to particles and views by name:
```
...
recipe
  map MyView # 'MyView' could be is defined in this manifest or imported
  MyParticle # 'MyParticle' could be is defined in this manifest or imported
```

Within a recipe; views, particles, and slots can be given 'local names'. Local names are scoped to the recipe:

```
...
recipe
  map MyView as view0 # establishes a mapped view with a local name of `view0`
  MyParticle
    param1 <- view0 # refers to the view mapped above by local name
```

* TODO: serialization can refer to items external to the manifest by 'id'.
