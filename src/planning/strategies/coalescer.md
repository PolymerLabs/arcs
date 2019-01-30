
# CoalesceRecipes
Detailed strategy description.

CoalesceRecipe strategy explores unresolved handles, handle connections and slot connections in a
recipe and tries to find possible recipes to coalesce with in the RecipeIndex.

## Handles coalescing
Coalesces recipes to satisfy an unresolved recipe handle.

### Detailed implementation description
Tries to resolve any (unresolved) recipe handle (aka requesting handle) that has:
- fate: 'create', 'use', '?'
- no ID
- non empty connections list
- and name not ‘descriptions’

Scan all recipes in recipe-index that have all their verbs resolved to actual particles. Select
all potential matching handles by scanning all handles of all recipes that:
- have non empty connections
- name isn't 'descriptions'
- requesting and potential handles together must have both 'in' and 'out connections, unless the
potential handle's fate is 'map' or 'copy'.
- if requesting handle has tags, the matching handle tags have a non-empty overlap
- requesting handle and matching handle types match (Handle.effectiveType)
- none of the handle connections has 'in' direction
- type variables must be constrained for reading (to avoid generic recipes)
- the total number of particles in both recipes <=10
- the evaluated handle's recipe is NOT already active in the arc
- the evaluated handle's recipe does not match the requesting handle


Coalescing is performed for all possible mathing handles.
When coalescing, the strategy attempts to coalesce as much handles as possible in the 2 recipes.

### Example
Recipe has handle0 that is not resolved:
```
schema Thing
particle ShowThing
  in Thing thing
particle CreateThing
  out Thing thing
recipe
  use as handle0
  ShowThing
    thing <- handle0
```

Recipe has a matching handle:
```
recipe
  create as handle0
  CreateThing
    thing -> handle0
```

The resulting coalesced recipe is:
```
 recipe
  create as handle0 // Thing {}
  ShowThing as particle0
    thing1 <- handle0
  CreateThing as particle1
    thing1 -> handle0
```

## Slots coalescing
Coalesces recipes to satisfy and recipe slot that must be provided based on its recipe spec, but isn't consumed.

### Detailed implementation description
For each recipe slot that:
- has no consume connections
- is slot created as part of this recipe (does not preexist in the arc)
- must be consumed (manifest syntax: \`must provide slotA\`)
- has a handle restriction (verified later)

Scan all recipes in recipe-index that have all their verbs resolved to actual particles. Select
all slot connections of all recipes that:
- don't have source connection
- is-set spec matching the requesting slot
- same name as requesting slot or non-empty tags overlap
- the requesting slot has no handle restrictions or the slot connection's particle has a handle
connection connected to the handle with the same ID as the requesting slot and their fates and
directions match. By requesting slot's handle restricted handle's fate:
  - 'create' or 'use': handle connection not connected, or its handle is 'use' or '?'
  - 'copy': handle connection not connected, or its handle is not 'create'
  - 'map': matching connections don't have output direction and matching handle's fate isn't copy.
  - '?': is not supported
- the total number of particles in both recipes <=10
- the evaluated slot's recipe is NOT already active in the arc
- the evaluated slots's recipe does not match the requesting handle
When coalescing for slots, coalescing is also performed for all possible mathing handles.

### Example
Recipe has a slot that must be consumed, according to the particle spec that provided it:
```
particle P1
  consume root
    must provide foo
recipe
  slot 'id0' as slot0
  P1
    consume root as slot0
```

Recipe can consume this slot:
```
particle P2
  consume foo
recipe
  P2
```

The resulting coalesced recipe is:
```
recipe
  slot 'id0' as slot1
  P1 as particle0
    consume root as slot1
      provide foo as slot0
  P2 as particle1
    consume foo as slot0
```

## Slot-connections coalescing
Coalesces recipes to satisfy an unresolved slot consume connection.

### Detailed implementation description
For each slots that is:
- unresolved
- has a name and a particle
- no target slot

Scan all recipes in recipe-index that have all their verbs resolved to actual particles. Select all provided slots that:
- is-set spec matching the requesting slot connection spec
- same name as requesting slot connection or non-empty tags overlap
- the potential slot has no handle restrictions or the requesting slot connection's particle has a suitable handle connection (mode detail on handle matching in [Slot Coalescing](#slots-coalescing)).

When coalescing for slots, coalescing is also performed for all possible mathing handles.

### Example
Recipe has a requied slot connection that isn't resolved:
```
particle P1
  must consume foo
recipe
  P1
```

Recipe provides a slot suitable for a slot connection above:
```
particle P2
  consume root
    provide foo
recipe
  slot 'root-slot' as rootSlot
  P2
    consume root as rootSlot
```

The resulting coalesced recipe:
```
recipe
  slot 'root-slot' as slot1
  P1 as particle0
    consume foo as slot0
  P2 as particle1
    consume root as slot1
      provide foo as slot0
```