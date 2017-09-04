# Manifest
An Arcs Manifest declares collections of Schemas, Particles, Recipes and Views. It's used as an input to the system from which suggestions can be produced.

By convention a manifest is stored in a file with the `.manifest` extension.

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

## Schemas
```
schema MyThing
  normative
    Text someValue
  optional
    URL someURL
```
* TODO: normative vs optional
* TODO: value types
* TODO: schema extensions

## Particles
```
particle MyParticle in 'my-particle.js'
  MyParticle(in MyThing, out [MyThing], inout [AnotherThing])
```
* TODO: slots
* TODO: descriptions
* TODO: particle JS

## Views
```
view MyView of [MyThing] in 'my-view.json'
```
* TODO: description
* TODO: format of json
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
