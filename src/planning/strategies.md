# Strategies

The planner applies these strategies to produce resolved recipes to be instantiated in the Arc.

## InitPopulation
Loads recipes from arc's recipe index. If contextual planning is requested,
only recipes that match handles or slots of the active recipe are returned.<br/>
Source code: [init-population.ts](./strategies/init-population.ts)

## ConvertConstraintsToConnections
Converts connection constraints (eg ParticleA.handleA -> particleB.handleB) in the recipe into actual particles and handle connections.
Note: arrow direction are ignored at this time.<br/>
Source code: [convert-constraints-to-connections.ts](./strategies/convert-constraints-to-connections.ts)

## AssignHandles
Maps recipe handle to a local or remote store with a matching type and tags.<br/>
Source code: [assign-handles.ts](./strategies/assign-handles.ts)

## AddMissingHandles
Creates a new recipe handle with a “?” fate for each handle connection that is not bound to a recipe handle.
The strategy is not executed on recipes with outstanding constraints or with free handles (ie handle with no corresponding handle connections).<br/>
Source code: [add-missing-handles.ts](./strategies/add-missing-handles.ts)

## CreateHandleGroup
Creates a new 'create' handle connecting a broadest possible set of unresolved connections.
Will never connect 2 connections from the same particle and requires at least one writing and one reading particle.<br/>
Source code: [create-handle-group.ts](./strategies/create-handle-group.ts)

## MapSlots
Maps consumed slots with provided slots within the same recipe and pre existing slots (provided by slot-composer).<br/>
Source code: [map-slots.ts](./strategies/map-slots.ts)

## InitSearch
Extracts search query from the arc and sets the search phrase in the recipe.<br/>
Source code: [init-search.ts](./strategies/init-search.ts)

## SearchTokensToParticles
Convert unresolved search tokens (from arc’s search query) to particles and add particles to the recipe.
The particles are matched by name and primary verb.<br/>
Source code: [search-tokens-to-particles.ts](./strategies/search-tokens-to-particles.ts)

## GroupHandleConnections
Group together handle connections of different particles that are not bound to any handles with other handle connections of the same type.
Handle connections of the same particle must be bound to different handles. If several handles of the same type exist, the preference is to group “in” connections with “out” ones.<br/>
Source code: [group-handle-connections.ts](./strategies/group-handle-connections.ts)

## MatchParticleByVerb
For recipe particles identified by verb rather than name, find particles matching the given verbs and names them.<br/>
Source code: [match-particle-by-verb.ts](./strategies/match-particle-by-verb.ts)

## NameUnnamedConnections
Names unnamed connections of a particle based on its spec.<br/>
Source code: [name-unnamed-connections.ts](./strategies/name-unnamed-connections.ts)

## CoalesceRecipes
Merges 2 unresolved terminal recipes and connects them through merging one unresolved handle from each recipe.
Handles that are merged need to be one of use/map/copy fate, connected to particles on both sides, and need to facilitate communication (everyone writing or everyone reading is not valid) and have connections of types and directions that allow such merge.<br/>
More details: [coalescer.md](./strategies/coalescer.md)<br/>
Source code: [coalesce-recipes.ts](./strategies/coalesce-recipes.ts)<br/>

## FindHostedParticle
Finds a matching particle for an unresolved _host_ connection.<br/>
Source code: [find-hosted-particle.ts](./strategies/find-hosted-particle.ts)
