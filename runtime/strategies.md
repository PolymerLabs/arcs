# Strategies

The planner applies these strategies to produce resolved recipes to be instantiated in the Arc.

## InitPopulation
Loads recipes from arc’s context recipes.<br/>
[init-population.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/init-population.js)

## ConvertConstraintsToConnections
Converts connection constraints (eg ParticleA.viewA -> particleB.viewB) in the recipe into actual particles and view connections.
Note: arrow direction are ignored at this time.<br/>
[convert-constraints-to-connections.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/convert-constraints-to-connections.js)

## AssignViewsByTagAndType
Maps recipe view with “use” fate to a local view in the arc matching type and tags.<br/>
[assign-views-by-tag-and-type.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/assign-views-by-tag-and-type.js)

## AssignRemoteViews
Maps recipe view with “map” fate to a remote view in the arc context matching type and tags.<br/>
[assign-remote-views.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/assign-remote-views.js)

## CopyRemoteViews
Maps recipe view with “copy” fate to a remote view in the arc context matching type and tags. On execution a new view will be created and contents of the remote view copied into it.<br/>
[copy-remote-views.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/copy-remote-views.js)

## AddUseViews
Creates a new recipe view with a “use” fate for each view connection that is not bound to a recipe view.
The strategy is not executed on recipes with outstanding constraints or with free views (ie view with no corresponding view connections).<br/>
[add-use-views.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/add-use-views.js)

## CreateViews
Sets view’s fate to “create”, if its fate was unknown and ID was undefined.<br/>
[planner.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/planner.js#L34)

## MapConsumedSlots
Maps provided and consumed slots within the given recipes.<br/>
[map-consumed-slots.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/map-consumed-slots.js)

## MapRemoteSlots
Maps consumed slots in the recipe with pre existing slots (returned by slot-composer).<br/>
[map-remote-slots.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/map-remote-slots.js)

## InitSearch
Extracts search query from the arc and sets the search phrase in the recipe.<br/>
[init-search.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/init-search.js)

## SearchTokensToParticles
Convert unresolved search tokens (from arc’s search query) to particles and add particles to the recipe.
The particles are matched by name and primary verb.<br/>
[search-tokens-to-particles.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/search-tokens-to-particles.js)

## GroupHandleConnections
Group together handle connections of different particles that are not bound to any handles with other handle connections of the same type.
Handle connections of the same particle must be bound to different handles. If several handles of the same type exist, the preference is to group “in” connections with “out” ones.<br/>
[group-handle-connections.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/group-handle-connections.js)

## CombinedStrategy
Run several strategy in a single transaction.
Each strategy is performed on leaf results of previously executed strategies. Only the leaf-results are returned to the strategizer.

Currently this strategy is used to execute SearchTokensToParticles together with GroupHandleConnections (that otherwise causes explosion of recipes in next generations).<br/>
[combined-strategy.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/combined-strategy.js)

## FallbackFate
For user search query based recipes, if the view’s fate wasn’t explicitly defined in the recipe and failed to resolve (while set to “use” by default”), try to set the fate to “map” or “copy” (depending on the view’s connections directions).<br/>
[fallback-fate.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/fallback-fate.js)

## MatchParticleByVerb
For recipe particles identified by verb rather than name, find particles matching the given verbs and names them.<br/>
[match-particle-by-verb.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/match-particle-by-verb.js)

## NameUnnamedConnections
Names unnamed connections of a particle based on its spec.<br/>
[name-unnamed-connections.js](https://github.com/PolymerLabs/arcs/blob/master/runtime/strategies/name-unnamed-connections.js)
