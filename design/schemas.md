# Schemas

## Schema definition

A schema is defined by a set of names, a set of referenced parent schemas to extend, and a set of named field types.

```
schema Thing

schema Car extends Thing
  Number doors

schema Tesla extends Car
  Boolean bioweaponDefenceMode
```

## Normalization

A normalized schema is a set of names, paired with a set of named field types:

```
schema Tesla Car Thing
  Boolean bioweaponDefenceMode
  Number doors
```

In the type system, we say that `schema Tesla Car Thing` is more specific than `schema Car Thing`. However `schema Tesla Car Thing` and `schema Car Tesla Thing` have the same normalization and are treated as equivalents.

## Interoperability

The following schemas are all valid and (depending on the scenario) can interoperate:

```
schema Tesla
  Boolean bioweaponDefenceMode

schema Car
  Boolean bioweaponDefenceMode

schema Tesla Car Thing as MostSpecific
  Boolean bioweaponDefenceMode
  Number doors
```

The following are not interoperable:

```
schema Tesla
  Boolean doors

schema Car
  Number doors
```

## Aliasing

For the purpose of manifest parsing and referencing, the schema is identified by the first name. This is not always desirable as there could for example be conflicting definitions of the `Tesla` schema during serialization. To avoid such conflicts, aliases may be assigned using `as`.

```
schema Tesla Car Thing as MyTeslaSchema
```

## Inline Schemas

Schemas may be defined inline. For example, consider the following in the context of a particle definition:

Typical usage: specify exactly what is required. This example is less specific than `schema Tesla Car Thing` above. Whether the set of names includes `Car` or `Vehicle` is irrelevant to the work of this particle.

```
in Tesla {Boolean bioweaponDefenceMode} param
```

Disambiguation: add names and fields to further restrict the possible resolutions of a recipe (just `Tesla` or `Car` might work here, but including both will further restrict potential handles).

```
in Tesla Car {Number doors} param
```

Inference: The type may be inferred from Tesla & Car at the top level for brevity. This will fail if neither Tesla or Car can be located via top level definition or import; or neither Tesla nor Car contain a field called `doors`; or Tesla and Car define `doors` with a different type.

```
in Tesla Car {doors} param
```

Referencing: When producing new entities an entire schema is typically referenced for brevity. This will fail unless Tesla can be located via top level definition or import

```
out Tesla param
```

# Importing Schemas

Todo:
*   Creating new entities should require a fully defined schema.
    *   It should be defined fully in the manifest alongside the particle.
    *   Or imported via a handle.
        *   This feature seems only for convenience since the schema of a handle/particle cannot change.

# Anonymous and Empty Schemas

A schema does not need to specify names or fields. The following schema is less specific than every other schema:

```
schema * as Anonymous

// or defined inline
in * {} param
```

# Field types

Primitive Types
*   Text
*   Boolean
*   URL
*   Number
*   Object (an object that can be serialized as JSON)

Structured Types
* Union (one of a set of primitive types)*
* Tuple (list of primitive types)