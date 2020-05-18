## Schema definition

A schema is defined by a set of names, a set of referenced parent schemas to extend, and a set of named field types.

```
schema Thing

schema Car extends Thing
  doors: Number

schema Tesla extends Car
  bioweaponDefenceMode: Boolean
```

## Normalization

A normalized schema is a set of names, paired with a set of named field types:

```
schema Tesla Car Thing
  bioweaponDefenceMode: Boolean
  doors: Number
```

In the type system, we say that `schema Tesla Car Thing` is more specific than `schema Car Thing`. However `schema Tesla Car Thing` and `schema Car Tesla Thing` have the same normalization and are treated as equivalents.

## Interoperability

The following schemas are all valid and (depending on the scenario) can interoperate:

```
schema Tesla
  bioweaponDefenceMode: Boolean

schema Car
  bioweaponDefenceMode: Boolean

schema Tesla Car Thing as MostSpecific
  bioweaponDefenceMode: Boolean
  doors: Number
```

The following are not interoperable:

```
schema Tesla
  doors: Boolean

schema Car
  doors: Number
```

## Aliasing

To reduce the amount of redundant declarations amongst manifests that define less specific schemas, schema aliases are introduced to provide reusable groupings of sets of names and fields.

```
alias schema Car as CarDoors
  doors: Number
```

## Inline Schemas

Schemas may be defined inline. For example, consider the following in the context of a particle definition:

Typical usage: specify exactly what is required. This example is less specific than `schema Tesla Car Thing` above. Whether the set of names includes `Car` or `Vehicle` is irrelevant to the work of this particle.

```
in Tesla {Boolean bioweaponDefenceMode} param
```

Alias usage: specify exactly what is required through use of a schema alias. Using the definition of `CarDoors` from above, the following is equivalent to `in Car {Number doors}`.

```
in CarDoors param
```

Alias widening: specify additional fields to complement an alias.

```
in CarDoors {Boolean bioweaponDefenceMode} param
```

Disambiguation: add names and fields to further restrict the possible resolutions of a recipe (just `Tesla` or `Car` might work here, but including both will further restrict potential handles).

```
in Tesla Car {Number doors} param
```

Inference: The type may be inferred from Tesla & Car at the top level for brevity. This will fail if neither Tesla or Car can be located via top level definition or import; or neither Tesla nor Car contain a field called `doors`; or Tesla and Car define `doors` with a different type.

```
in Tesla Car {doors} param
```

Referencing: When producing new entities a concrete schema is required to be referenced. This will fail unless Tesla can be located via top level definition or import

```
create Tesla param
```

# Importing Schemas

TODO:
* Should it be possible to import schemas?
  * Perhaps during developement, but not in a published manifest.
* Creating new entities should require a fully defined schema:
  * Fully in the manifest alongside the particle.
  * Or imported via a handle.
   * Again, perhaps this is only a development feature, since the schema of a handle/particle cannot change.

# Anonymous and Empty Schemas

A schema does not need to specify names or fields. The following schema is less specific than every other schema:

```
schema * as Anonymous

// or defined inline
in * {} param
```

# Field types

Primitive Types
* Text
* Boolean
* URL
* Number
* BigInteger
* Object (an object that can be serialized as JSON)

Structured Types
* Union (one of a set of primitive types)*
* Tuple (list of primitive types)
