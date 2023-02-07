# Entities in Particles - Snapshots vs. Live Objects

_shans@, May 2020_


## Introduction

The next-level storage design doc brings up a design question ([here](https://docs.google.com/document/d/1yNEMKzUnXqbie9RNoHjROf0odcH3QPzjfJhdD8Ob0M8/edit#heading=h.iuj6w6fdj5pu)) around whether entities should be exposed to particles as live objects or as snapshots. This document looks more closely at that question.


## Entities as Live Objects

If entities were live objects, then:



* entities would provide a mutate method which would cause the mutations to be reflected in the state of the entity on return of the method
* entities would change over time based on updates from remote writers to the entity.
* entity handles would not be directly exposed or visible; everything would be mediated via the entity object
* new entities could be constructed directly; they would be connected into a backing store when written into a collection or singleton.
* constructing a new entity to be referenced by something would be a little odd; doing this directly would be awkward (we’d need to expose the entity handle multiplexer to allow directly writing the entity back to a backing store) but a composed view would make this much cleaner & easier.

Note that storage proxies are paused while a particle’s callbacks are running, so this second point only shows up between callback execution.

For example, with live objects, we might see something like this:


```
onUpdate({added}) {
  for (const entity of added) {
    if (meetsSomeMetric(entity)) {
      entity.referenceField.dereference().then(referencedEntity => {
        // NOTE: entity might have changed because the dereference runs as a 
        // different "callback" to onUpdate.
        referencedEntity.mutate({ownerMeetsMetric: true});
        // referencedEntity now reflects these changes
      });
    }
  }
}
```


Storing an entity into a reference field would look something like:


```
onUpdate({added}) {
  const newEntity = new MyEntitySubclass({...}, whatShouldThisArgBe?);
  added[0].mutate({refField: new Reference(newEntity)});
}
```


The “whatShouldThisArgBe” argument would be used to determine where the entity is to be stored; it might be a storage key, or some kind of opaque region identifier, or an EntityHandleMultiplexer depending on how we’d like to do things.

In a composed view we can just store the entity directly in a field:


```
onUpdate({added}) {
  added[0].mutate({refField: new MyEntitySubclass({...})});
}
```


It should still be possible in this approach to explicitly provide a storage key (or region identifier, or whatever) to the MyEntitySubclass constructor if the developer wants the entity to live in a specific place rather than wherever refField’s storage defaults to.

Note that the entity doesn’t need to be a CRDT; it can still delegate updating to the storage proxy (or handle if the entity is read/write) as submitting an operation to a storageProxy should be synchronous and return only after local application of the operation has completed

Registering for entity updates would also happen directly on the entity; the event handler would receive a summary of the update (which field(s) changed and how), and the state of the entity would be directly observable:


```
entity.onUpdate = (changes) => {
  // changes contains the delta
  // entity reflects the changes
}
```


Once registered, entity updates would be scheduled in the same way as handle updates, particle-wide event handlers, and dereference callbacks.


## Entities as Snapshots

If entities were snapshots, then:



* the handle that backed each entity would need to be readily accessible to users of the particle API
* a mutate method would exist on the handle
* event registration would happen directly on the handle
* dereferencing a reference could return a handle rather than an entity directly; alternatively entity snapshots would need to hold references back to their handle.
* a convenience method for mutation might exist on the snapshots, but would return new snapshots.
* entity update event callback arguments would contain both the update and a new snapshot of the entity (or alternatively the entity snapshot would be retrieved from the handle directly).
* entities could only be constructed by explicitly constructing a new handle (I think)

This matches the way collections and singletons are currently exposed pretty closely - the extra complications come from the fact that entities don’t map 1:1 back to registered handles.

The equivalents of the above code snippets are shown below.

dereferencing and updating the dereferenced entity:


```
onUpdate({added}) {
  for (const entity of added) {
    if (meetsSomeMetric(entity)) {
      entity.referenceField.dereference().then(referencedEntity => {
        // NOTE: entity is a snapshot and will not have changed.
        const updatedRE = referencedEntity.mutate({ownerMeetsMetric: true});
        // updatedRE reflects these changes, referencedEntity does not change
      });
    }
  }
}
```


Note: if it’s important to have the most updated version of entity available inside the dereference callback then another fetch needs to happen. This should be synchronous, so won’t cause any particular problems.

storing an entity into a reference field (non-composed view):


```
onUpdate({added}) {
  // this doesn't need to be asynchronous because the new entity
  // handle can connect to storage in the background.
  const newEntity = this.entityMuxer.createEntity({...});
  added[0].mutate({refField: new Reference(newEntity)});
}
```


The composed variant of the above looks more-or-less the same.

Registering an event handler:


```
entity.handle.onUpdate (changes, snapshot) => {
  ...
}
```



## Comparative Analysis

There’s not a great deal of difference between the two approaches at the end of the day, largely because the between-callback update approach that we’ve chosen smooths out the worst excesses of live objects. I think I could live with either approach. It seems like live objects might be a slightly cleaner API, but snapshots might be more similar to other parts of our existing APIs.

One way to think about this is that each approach has an awkward thing about it. The awkwardness comes down to the fact that entity handles are a bit different to collection handles - they’re multiplexed (the static thing written into a particle specification is a handle multiplexer and you need to extract an individual handle from that, using the entity’s id).

Which of these can we live with?



1. entities act a bit differently to collections in that you don’t need to re-fetch entities each time a new callback function runs - they’re already up-to-date (collections would need to be re-fetched); **_or_**
2. entities act a bit differently to collections in that they contain a reference to their handle, which you need to use to bring the entity up-to-date when a new callback function runs (collection data doesn’t contain a reference to its handle); **_or_**
3. entity handles act a bit differently to collection handles in that you need to explicitly ask a handle multiplexer for a particular handle matching an entity ID when you want to get up-to-date data for an entity with that ID

Which would you like better? Is there anything I’ve forgotten / ignored / overlooked?
