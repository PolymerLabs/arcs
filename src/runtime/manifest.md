# Manifest
An Arcs Manifest declares collections of Schemas, Particles, Recipes and Stores. It's used as an input to the system from which suggestions can be produced.

By convention a manifest is stored in a file with the `.arcs` extension.

## Schemas

Schemas define the simple data structure of Entities that are passed via Handles to Stores
as inputs and outputs of Particles. See [schemas.md](../design/schemas.md) for more info.

```
schema MyThing
  someValue: Text
  someURL: URL
```

A schema can extend another schema defined or imported into the same manifest.

```
schema YourThing

schema MyThing extends YourThing
  myStuff: Text
```

* TODO: value types

### Descriptions

A schema can contain a description, which will override the default representation of the schema in recipe descriptions.
```
schema USCity
  name: Text
  state: Text
  description `city` // used as singular type description
    plural `cities` // used as plural type description, instead of the default 'city list'
    value `${name}, ${state}` // used as the city value format, instead of the default ${name}.
```

## Particles

Particle definitions define the shape of a Particle -- its parameters, the slots
that it provides and consumes and the location of the particle implementation.

```
particle MyParticle in 'my-particle.js'
  myinthing: reads MyThing
  myoutthings: writes [MyThing]
  otherthings: reads writes [AnotherThing] 
```

### Slots
Particles that produce UI must define which slots they use for rendering. Slots may be declared required (default) or optional. Even if all slots are optional, at least one of them must be provided in order for the particle to be instantiated. Each slot may be consumed by multiple particles.

"root" slot is a special slot that is provided by the system before any of the particles are rendered. If particle renders and creates slots for other particles to use, they are also defined in the manifest. The provided slots may restrict the handles to be rendered in the slot. The particle that consumes the provided slot must have the same handle bounded as one of its connections.

```
particle MyParticle in 'my-particle.js'
  myinthing: reads MyThing
  myoutthings: writes [MyThing]
  mySlot: consumes  // required
    innerSlot: provides?
    restrictedInnerSlot: provides? Slot {handle: myinthing}
  otherSlot: consumes?  // optional
```

A collection of slots will be provided for a handle that contains a collection of entities. A separate slot will be created for each individual element in the handle. The consuming particle must be explicitly defined to consume a colleciont of slots as well.

```
particle MySetParticle in 'my-set-particle.js'
  mything: reads [MyThing]
  mySlot: consumes Slot
    innerSlot: provides [Slot]

particle MyItemParticle in 'my-item-particle.js'
  mythis: reads [MyThing]
    innerSlot: consumes [Slot]
```

### Descriptions
Particle description defines how the Particle is represented in the recipe suggestion text. Description includes a sentence pattern, and optional individual argument descriptions.

```
particle MyParticle in 'my-particle.js'
  mything: reads MyThing
  main: consumes
    secondary: provides
  description `Do Something with ${mything}`
     mything `my special thing`
```

Description may also reference the following details from the handle descriptions:
- ```${mything}._type_``` to include the handle type (eg MyThing)
- ```${mything}._values_``` to include only the values of the handle
- ```${mything}._name_``` to include the handle description with no values
- ```${mything.myProperty}``` to include a select property of the handle (only supported for singleton handles)

or from slot descriptions:
- ```{main.secondary}``` to include the description of a recipe particle that consumes the 'secondary' slot, provided by MyParticle.
- ```{main.secondary}._empty_``` true, if the secondary slot actually consumed to render content.

Only the descriptions of Particles that render UI will be used to construct the suggestion text.

Handle descriptions may also be used in particles UI (including other particles in the recipe that use the same handle). The particle template would contain:
```
<span>{{mything.description}}</span>
```

* TODO: particle JS

## Stores

Stores contain entities of a particular Schema. Stores may contain a singleton or collection of Entities:

* `store MyProduct of Product in 'my-products.json'`
* `store MyProducts of [Product] in 'my-products.json'`

Or they may contain particles:

* `store MyParticle of ParticleShape in ParticleResource`

Stores can reference their underlying data in one of three ways:
1) data can be serialized into a json file: `store MyProduct of Product in 'my-products.json'`
2) data can be serialized inline into a manifest resource: `store MyProduct of Product in ProductsResource`
3) data can be maintained in an external store and referenced by storage key: `store MyProduct of Product at 'firebase://my-firebase-key/with/details'` 

Stores backed by json or local resources are immutable. They may be mapped, or copied via a
Recipe into an arc.

Stores can contain a simple description:

```
store MyProducts of [Product] in 'my-products.json'
  description `These are some of my favorite things`
```

The JSON file specified contains the contents of the store.

Given the schema:

```
schema Product
  name: Text
```

A corresponding JSON file might look like:

```json
[
  {"name": "Pizza"},
  {"name": "A Pony"},
  {"name": "The world's largest Pinata"}
]
```

The JSON representation for a singleton store is the same, if the JSON file contains
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

Can include how particle inputs are connected to handles:
```
...
recipe
  handle1: map *                 // maps a store external to the arc; changes in the
                                 // external store will be reflected locally, but the
                                 // local handle is read-only.
  handle2: use *                 // uses some handle already in the Arc
  handle3: create *              // creates a new empty handle
  handle4: copy ImportedHandle   // creates a handle on a new store populated with entries
                                 // from a store defined in or imported by the manifest
                                 
  SomeParticle
    param1: reads handle1        // bind's SomeParticle's input param1 connection to handle1
    param2: writes handle2       // binds output connection
    param3: reads writes handle3 // binds input and output connection
    param4: reads handle4        // binds the copied handle.
```

Can include how particles are connected to slots:
```
...
recipe
  TheirParticle
    root: consumes
      specialSlot: provides slot0
  MyParticle
    mySlot: consumes slot0
```

Can include a recipe description:
```
...
particle MyParticle in '...'
  myThing: reads Thing

recipe
  MyParticle
  description `do something with ${MyParticle.myThing}`
```
If a recipe description is specified, it takes precedence over individual particle descriptions.

## Importing other manifests
A manifest can be self contained or can import Schemas, Particles, Recipes and Stores from other manifest files.

```
# By relative path:
import '../somewhere/another.arcs'
# Or URL
import 'https://fancy-thing.glitch.io/everything.arcs'
```

Everything in the hierarchy of imported manifests is then made available in the manifest scope.

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
store MyStore
schema MySchema
schema mySchema  // This is an invalid name.
```

Particle and store definitions can refer to Schemas (defined or imported) by name:
```
schema MySchema
particle MyParticle
  MyParticle(in MySchema)      // uses the schema defined above
store MyStore of [MySchema] ...  // again, uses the schema defined above
```

Recipes can refer to particles and stores by name:
```
...
recipe
  map MyStore // 'MyStore' could be is defined in this manifest or imported
  MyParticle // 'MyParticle' could be is defined in this manifest or imported
```

Within a recipe; handles, particles, and slots can be given 'local names'. Local names are scoped to the recipe:

```
...
recipe
  map MyStore as handle0  // establishes a handle mapped to MyStore with a local name of `handle0`
  MyParticle
    param1 <- handle0  // refers to the handle mapped above by local name
```

* TODO: serialization can refer to items external to the manifest by 'id'.
