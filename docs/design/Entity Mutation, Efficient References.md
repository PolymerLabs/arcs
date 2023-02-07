# Entity Mutation, Efficient References, Efficient Joins & Filters

_shans@, March 2020 [http://go/storage-next-steps](http://go/storage-next-steps) _


## Introduction

This document sketches a design to efficiently support entity mutation, references (including collections backed by references) and joins in the presence of SQL-style storage. At this stage, the document is not intended to be a complete design of any of these features, but will instead hopefully provide some guidance as more complete design docs are written.


## Design Principles


### CRDTs

All storage is mediated by CRDTs. Each CRDT type encompasses a model (the thing that is being stored) and operations (ways to modify the model). The CRDT model + operations completely defines how stored data can change.

Every change is made by an “actor”, each of which is represented by a string. Actors do not need to be registered in advance with storage, but every actor string must be unique; for example a 64-bit random number, or a child ID generated using Arcs’ hierarchical ID generation approach.

All CRDT models and operations contain a version clock, which is a map from actor to version numbers.  Every submitted operation when applied to the version clock of the relevant model must advance the actor’s version by 1 and must not advance any other version.


#### Collection CRDTs

A collection model consists of:



* version clock
* a map from a contained object’s ID to
    * the object itself
    * the state of the version clock at the point when the object was added

Collection operations are:



* **add **an object to the collection
* **remove **an object from the collection
* **fast-forward** (which represents a number of adds and/or removes applied together).

Note that the objects contained within collections are completely opaque - they are identified blobs that can only change atomically.


#### Singleton CRDTs

Singleton models are identical to collection models. Singleton operations are:



* **set** the singleton value to a particular object
* **clear** the singleton

The object represented by a Singleton is opaque, like with collections.


#### Entity CRDTs

Entity models consist of:



* a version clock
* a map of singleton field names to Singleton CRDT models
* a map of collection field names to Collection CRDT models

Entity operations are:



* **set** a singleton field to a particular value
* **clear** a singleton field
* **add **a value to a collection field
* **remove** a value from a collection field
* **fast-forward** a set of additions and removals on a collection field (**note:** this isn’t yet implemented).
* **clear-all** values (sets all singleton field values to null and empties all collection fields)


### The Storage Stack

The storage stack is divided into the following components:



* **Handles **provide the programmer API for CRDTs; for example a collection handle will allow programmers to add and remove elements from a collection. Handles also add identifiers, TTL records and storage key information, and convert between a programmer view and a CRDT view.
* **Storage Proxies** host a CRDT to be shared between all Handles inside a domain (e.g. an ArcHost or an isolation unit). Storage Proxies:
    * buffer local and remote updates
    * apply updates at safe application points
    * distribute updates to listening handles
* **Stores **also host a CRDT and mediate between the CRDT view and a storage driver.
* **Drivers** are responsible for storing CRDT models to storage (whether memory, disk or other).

A storage stack is established by providing two pieces of information:



* a **Storage Key**, which identifies where to store stuff
* a **Type**, which identifies what sorts of things will be stored. Importantly, the type identifies the CRDT to be used.


### Driver Protocols

Notionally, drivers should be able to express a range of different APIs depending upon backing storage capabilities. Each driver API requires explicit Store support. There are two potential models for this:



1. Stores can deal with all driver APIs and each store is configured at runtime depending upon what its registered driver will support.
2. Special stores exist to deal with specific kinds of driver API

Currently, only a single driver API exists: opaque blobs of data can be written, along with a sequence number. If the sequence number is out-of-order, the driver will fail the store and then deliver the current blob + sequence number to the writer. Furthermore, drivers will deliver successful blobs from other writers.


## Current Design Problems


### References

References are a mechanism that allow linking to an identified piece of storage. References point to an object within a set of objects - each reference is a combination of a storage key to the set, and an identifier locating the object within the set.

At the moment, references are used in two different ways:



1. they’re used by Reference Mode Stores (see below)
2. they’re exposed as a cross-linking mechanism to particle developers.

References used by Reference Mode Stores contain a storage key that points at a “backing store”. These are not currently well-defined outside the scope of Reference Mode Stores.

References exposed to particles differ between the TypeScript and Kotlin storage implementations. In TypeScript, each particle-exposed reference contains a storage key which points at a CRDT collection, while in Kotlin the key points at a backing store.

This difference needs to be resolved; however neither implementation’s behavior is currently correct. In particular:



* the Kotlin implementation can’t reference entities stored outside of backing stores (e.g. in ramdisk collections sourced from manifests)
* the TypeScript implementation’s references become invalid when the underlying entity is removed from the referenced collection


### Reference Mode Stores

Collections and Singletons are the only CRDTs for which Handles exist. For a handle connected directly to a driver via a proxy and a store, this means that entities are just blobs of data contained within collections/singletons. Hence, when a particle reads an entity from one collection and writes it to another, a copy of the entity data is made.

To address this, we introduced the concept of a Reference Mode Store. From the perspective of a storage proxy, Reference Mode Stores look like stores that vend collections of entities, but internally they maintain a collection of references and a backing store.

Reference mode stores are configured with a composite storage key that contains information about both the collection storage and the backing store. If multiple reference mode stores are configured to point at the same backing store, then entities won’t be copied between collections; instead a single instance will be maintained in the backing store.

However:



* Reference Mode Stores prevent exposing entities directly to particles (which prevents entity mutation)
* Reference Mode Store references aren’t ever exposed to particles and can’t directly be reused
* Reference Mode Stores aren’t optimized for SQL-style extraction/update of data.


## Missing Features


### Entity Mutation

Exposing Entity CRDTs directly to Particles will allow particle authors to modify entities and have those modifications automatically merge with modifications made by other particles. This is particularly important for fields that store collections of values; currently any particle that writes into a collection field automatically writes over any data provided by other particles.

This is also an important step on the way to the following features:



* more exotic CRDT field types like ordered lists
* DFA tracking of communication channels opened up by the ability to read/write from entity data


### Efficient Filters

Filters are currently implemented in handle classes. This works, however it means that **all** data needs to be transferred from driver to store to proxy to handle (& thereby copied multiple times) before it can be filtered and provided to the Particle.

Ideally, filters would run in SQL where possible, and lower down the stack where not. However, the Arcs model fundamentally splits extraction of data into two pieces: extraction of references and dereferencing. This makes optimized filter application difficult as ideally both steps would apply at the same time at the driver level.

Ray’s put together some additional ideas / requirements for efficient filtering in Kotlin; please see [this doc](https://www.google.com/url?q=https://docs.google.com/document/d/1YSn8PVGP235R40AaE4BXA-Nh3I6BR1FfKsq0X5H5NpE/edit%23&sa=D&ust=1587076285632000&usg=AFQjCNE9nEqIIWNK28IXE49ha2h6N6nRdg).


### Efficient Joins

Joins operate over multiple handles, looking at all Entities from each handle, establishing a mapping between them, and potentially filtering out Entities that don’t match the mapping or for which additional criteria fail.

Joins look fundamentally similar to filters in that we need a way to take multiple independent reads from different handles, apply some sort of logic, and present the result as a coherent whole. Whatever design approach allows us to abstract over multiple handles for filters should apply to joins as well.


### Entity Patches

Entity patches are a way of allowing Entities to appear mutable, while maintaining per-Arc mutability requirements. They also allow mutations to accumulate on an Entity without those mutations leaking backwards in dataflow.

Essentially, an Entity Patch:



* is also an Entity
* contains a set of fields that override / augment a parent Entity
* contains a reference back to the parent Entity

In the sense that this can already exist with “standard” Entities, we can build entity patches right now. However, we also want to add API support that:



* allows a patched entity to be viewed as if it were the parent entity by default - i.e. the default access APIs report that the patched entity has the ID of the parent entity and contains fields which are the parent entity’s fields overridden/augmented by the patch.
* allows mutations to be transparently generated as if mutating the parent entity
* allows inspection of the parent entity when required

Notionally, a tree of Entity Patches can be supported on any given Entity. The view any given particle sees is the composed view up to the root from the patch that the particle has.


## Proposal

This is a fairly large proposal, in that there are a number of new concepts and the end state looks significantly different to what we currently have.

We should phase implementation across a number of levels, and the design concepts layer similarly. I’ve presented them in the same levels to help stage understanding; at the end of each level we should have a consistent view of a well-designed system.

For reference, the levels are:



* Level 1: Build out direct access to Entities at the Particle level and enable the removal of ReferenceModeStores. Our platform will be more capable at this point (entity mutation will be implemented) but also harder to use (collections will *only* be references and particles will need to manually stitch together collections of entities from those references). 
* Level 2: Add a new handle (a “combined handle”) that combines a BackingHandle and a CollectionHandle of references into a composed collection of entities. Add syntax to the manifest for defining these & a new storage key type that acts like reference-mode but at the handle level. This gets us more-or-less back to our current state. Extend this support to dereferencing contained references as well.
* Level 3: Add an optional new storage stack that connects to the new handles and allows for efficient SQL reads which automatically “mend” the BackingHandle/CollectionHandle stacks. This will allow us to start investigating efficient writes too; some notes are provided below.

Additionally, there are some more speculative levels that we can continue to work on defining while starting design/implementation of the above:



* Level 4: Entity Patches. Design & implement API for generating and consuming patched entities cleanly. Add support to the combined handle from Level 2 so that fetching patched entities is atomic. Add support to the new storage stack from Level 3 so that it’s efficient.
* Level 5 & beyond: Probably we would want to do the good stuff from Level 2 next (see “A thought for the future” in the Level 2 description). Alternatively, efficient writes may be more important.


### Level 1: Breaking everything to make it right


#### Entity Handles

We will create a new Handle class that provides a programmer API for mutation of entities. This will provide something like the following API:


```
class Handle<T extends Entity> {
  function get(): T;
  function mutate(entity: T, mutator: Consumer<{}> | {}): void;
  // plus the ability to register for updates
}
```


This handle type will be the only way to modify an entity; for example, if code tries to write a modified version of an entity into a collection, this will result in an error:


```
  e = new MyEntity();
  e.field = 'first value';
  handle.add(e);
  handle.remove(e);
  e.field = 'second value';
  handle.add(e); // this will throw
```


Likely we will disable any form of direct writes to entity fields and only allow a mutate method. This method will either call an underlying handle’s mutate method or throw if the appropriate handle hasn’t been established.

An open question is whether the entities returned by handles are live objects or snapshots. If they’re live objects, then the value of an extracted entity that is stored locally may change between successive onUpdate calls. On the other hand, a snapshotted entity would be forever static unless mutated locally, and new snapshots would need to be retrieved in order to see remote changes.

Snapshots are likely to be simpler to implement and reason about, however the fact that they will incorporate local but not remote changes may seem quite strange. Live objects are likely to be cheaper (the data can be directly stored in the StorageProxy and doesn’t need to be copied) but come with their own cognitive issues.


#### Entity Storage stacks

In order to support Entity Handles, we need to have StorageProxies and Stores that back the handle with data & the ability to submit operations. We can reuse the existing StorageProxy and DirectStore implementation for this purpose as they are agnostic in terms of which CRDT implementation they host.

However, the current mechanism for establishing a storage stack requires particles to declare the stacks they need in advance as handle connections (i.e. in the particle manifest). This is untenable for Entities as it would require that the Particle know in advance all the IDs of the Entities it would edit.

As a result, we’ll group entities into sets and talk about access to those sets at the particle level. We’ll call these sets “backed sets” and access to them will be mediated via “backing storage stacks”.


#### Backing Storage Stacks

A backing storage stack consists of:

**Backing storage:** Some of our drivers (notable SQLite and Volatile drivers) allow multiple entities to be stored behind a single storageKey. The entities are disambiguated by their ID.

**BackingStores**: These already exist and provide multiplexed access to entities stored in Backing Storage.

**BackingStorageProxies**: BSPs extend the notion of a backing store to the inside of the isolation boundary. They’re implemented for TypeScript but not Kotlin.

**BackingHandles**: A backing handle provides access to entity handles:


```
class BackingHandle<T extends Entity> {
  function get(reference: Reference): Handle<T>;
}
```


The current implementations of BackingStores and BackingStorageProxies simply wrap multiple DirectStores and StorageProxies respectively. Hence, entity storage stacks are fully hosted inside backing storage stacks.

It’s possible to provide more optimized BackingStores that would pair with Drivers that exposed extension APIs for direct access to entities without having to wrap DirectStores and multiple Driver objects. This approach is not in scope for this design document.


#### Changes to References

References inside ReferenceMode stores contain a version map that identifies the version an entity was at when it was referenced. This is important to distinguish between the automatic (and empty) entity that a backing store will always provide for a new id and the actual current version of that entity once stored and reflected.

We’ll need to copy this mechanism in particle-level references. We might be able to additionally use it in the future as a sort of transaction model.


#### Syntax Support for Particle Manifests

Particles that wanted to read or modify entities (as opposed to just seeing membership of collections) will need to register a handle connection that generates a BackingHandle; that is, particles that currently look like:


```
particle
  things: reads [Thing]
```


will need to instead look like:


```
particle
  things: reads [&Thing]
  thingData: reads #Thing
```


(Exact syntax TBD).

Note that this extends to nested references too, so


```
particle
  things: reads [Thing {refField: &Other}]
```


becomes


```
particle
  things: reads [&Thing {refField: &Other}]
  thingData: reads #Thing {refField: &Other}
  otherData: reads #Other
```


A couple of notes:



* This is repetitive and tedious, but we’re going to fix it in the next level. We’re actually helping generate a much clearer connection graph here - now we have actual information about what the particle can read and what it can write, at the database object level, so we can trace communication better.
* For now we should probably put all backing data in one place, that is thingData and otherData will have the same storageKey (or maybe we could have one for Thing and one for Other, but this gets tricky when we have `Thing Other { … }`)
* Backing storage doesn’t actually enforce or restrict the types of entities written into that storage; hence it would be possible to combine the thingData and otherData handles together, but then the derived entity handles would be untyped & that would be messy. There’s not actually much overhead to duplicate BackingHandle/BackingStorageProxy objects as they are just multiplexers.
* We can most likely run level 1 in parallel with ReferenceModeStores if we don’t want to subject particle developers to too much pain. This would allow us to build out level 2 and then switch across.


#### Particle API Considerations

Dereferencing now requires active participation of a handle, so instead of


```
reference.dereference(): Entity
```


one would use


```
backingHandle.get(reference): EntityHandle
```


At this stage, the API is not pleasant to use. In order to fetch all the bits and process them, you could do something like this (Don’t worry! This gets better in level 2!):


```
things.onHandleUpdate = ({added} => {
  added.forEach(reference => {
    thingData.get(reference).get().then(entity => { // *1
      otherData.get(entity.refField).get().then(other => { // *2
        // do something with entity and other
      }
    }
  }
}
```


Note that at the point where the Thing reference is resolved (*1) we no longer know if the Thing is still in the collection (the collection is out-of-date); and at the point where the Other reference is resolved (*2) then the Thing is out-of-date (even potentially to the point of not referencing Other any more). We can resolve this somewhat once our threading is sorted by explicitly refetching thing and/or the collection before doing further processing.


### Level 2: Fixing it back up again


#### Combined Handles

At this level, we need to introduce new handle constructs that combine the output of primitive handles together into coherent views for particles to consume. Lets call these constructs “combined handles”.

A combined handle:



* listens to sync/update events on multiple underlying handles, and
* synthesizes their output into something that represents the underlying data in a more convenient way.

For now, we should build a single combined handle type: it should fully resolve all references in collections as well as in entity fields so that the provided data is maximally available.

How this works precisely will depend on whether Entities are snapshots or live objects.

**If they are snapshots**, then the combined handle can collect frozen entity snapshots based on an authoritative reference set (from the collection handle), and recurse on the entity snapshots to collect references for dereferencing. Once the whole image is ready it can be delivered.

As each entity snapshot is fetched for the first time, a live stack will be constructed to provide this snapshot. That stack will update over time in response to entity mutation events. Each time an update to the collection happens, a new image can be constructed based on snapshots of the latest data for each hosted entity.

This is a fairly simple and clean picture, however it raises questions about how to register for entity mutation events, and how these events will be delivered.

**If they are live objects**, then the combined handle will need to be able to suspend updates on the objects while assembling an image. While somewhat more complicated, this also answers the question of entity mutation registration and delivery - the entity itself will reflect mutation updates and will suspend updating while a combined handle image is being constructed. Update events will be generated by the entity itself and these will naturally also suspend at appropriate times.

**Note** that we’re really going to need to think carefully about how read/write collections work! I suspect they work better with a live object scenario, because the object is the source of truth against which operations can be generated.

Our combined handle will also need to support the query function, so we’ll need to run our naive (in-handle) filtering in the combined handle directly.


#### Particle API Changes

Ideally, particles would both be able to specify combined handles explicitly as a combination of fundamental handles, and also specify just the combined handle and have the fundamental pieces be implied.


```
particle
  thingRefs: reads [&Thing {refField: &Other}]
  thingData: reads #Thing {refField: &Other}
  otherData: reads #Other
  things(thingRefs, thingData, otherData): reads [Thing {refField: Other}]
```


or just:


```
particle
  things: reads [Thing {refField: Other}]
```



#### A thought for the future

The trick, long term, is that we want to build out combined handles so they work _generically_ - rather than having to write a combiner for every kind of dereference or collection synthesis, we want to write a small number of combiner combinators that can be plugged together automatically based on input and output requirements.

We can decompose the problem into two parts:



* Writing atomic combiners that express their effect in terms of a generic transformation of primitive handle types to combined handle type
* Writing an engine to combine atomic combiners together in order to express more complex effects.

Here are two simple example atomic combiners:

**Converting collections of references into collections: **([&~A], #~A) -> [~A]

**Dereferencing an entity on a field: **A {~f: &~T} -> A {~f: ~T}

I think it’s clear that these _can _combine, and it should become clear how to build them once we do the work defined for level 2. Less clear is how to automatically combine them. Food for thought!


### Level 3: Making it fast

Once level 2 is implemented, we have:



* Well-defined “clusters” of composed data pieces
* independent CRDT stacks for each entity and collection definition within a cluster
* A single agent (the combined handle) that understands requests from the particle and adapts them into individual stack operations.

What level 3 adds to the picture for efficient **reading** is:



* a query execution stack that allows the combined handle to directly query storage
* conversion routines to generate appropriate queries, and
* the ability for combined handles to apply retrieved data to the top of each CRDT stack.

Efficient **writing** is possible too; however there are some nuances:



* It should always be possible to perform efficient operations that are guaranteed not to conflict (e.g. creating & adding a guaranteed-unique entity to a collection)
* bulk writes that might conflict can be implemented as transactions at the back-end, however this will need an alternative syntax to standard entity/collection mutations.

At this stage we should consider efficient writing to be a speculative feature - we may choose to experiment with it but it isn’t necessary to build out just yet.


#### Query Execution Stacks

Essentially these are conduits from combined handles directly to storage drivers. They look a lot like storage stacks (they provide for bidirectional communication between handles and drivers) but they are 1:1 from handle to driver and therefore don’t require a CRDT internally.

Query Execution Stacks are specific to a particular back-end. We should provide a general purpose conduit but each stack will expose a different subset of functionality depending upon what the back-end can support.  We should be able to provide a relatively clean design describing how a combined handle can switch between an efficient operation and standard operations depending on the configuration and what functionality is available.

An important consideration with regards to these is that any data sent from particle to storage is auditable; hence it’s best to ensure that only already-known information (like types) is sent.


#### Efficient Reading Example

Say a particle wants to see all the contents of a handle with type `[Product {name: Text, review: &Review {author: Text, rating: Number}}].`

Under the layout proposed in level 2, this would require:



* a read of the collection, returning Product references
* a read of each Product reference
* an extraction of the Review reference from each Product & a read of these references

Instead, with a query execution stack, the combined handle would send the type statement directly to the data store driver. The driver will then generate a query (or a sequence of queries) to extract the data from the store. This should result in the generation of a set of models; one collection model, multiple Product models and multiple Review models in this scenario; which would be sent back through the query execution stack as a response.

The combined handle would then do two things with the returned models:



1. establish and “seed” the top of a set of handles with the models. Because of the nature of CRDT structures, this allows immediate safe modification of the data; the storage stacks are “self healing”
2. provide the models to the Particles as a sync message.


#### Efficient Filters

Efficient filters are an extension of the idea of efficient reading to handles with refinement types. Instead of fetching all data and then filtering in-handle, we can roll the refinement portion of the type directly into the datastore query.


#### Efficient Joins

Efficient joins also extend the idea of efficient reading, though we will need to think more carefully about how the combined handle should work here. However, it’s clear that (just like a standard combined handle) a join handle synthesizes a particle view based on data from multiple input handles, and that this synthesis will in many circumstances be able to be performed more efficiently in the datastore.


#### Efficient Writing

The writing semantic for Particles is that updates are guaranteed to succeed. This works via the CRDTs installed inside storage stacks; any changes are guaranteed to be able to merge with updates further down the stack.

It’s not generally possible to provide this semantic at the database level, as the changes need to be generated and applied individually against CRDTs, but the datastores are not CRDT aware. Even if we could provide the semantic (e.g. with datastores that implement CRDTs internally), efficiency gains arise from being able to perform bulk transformations of the data, something that isn’t feasible if CRDTs are part of the picture.

However, certain types of writes are able to be expressed as atomic db transactions that are guaranteed to succeed. For example, adding a new entity with a guaranteed-unique id to a collection consists of:



* adding the entity reference to the collection; this is guaranteed not to collide with other references as the id is unique
* adding a new entity to the backing store; this is guaranteed not to collide with other entities as the id is unique

These kinds of operations can be modeled in a similar manner to efficient reads:



* first, the update is applied locally
* the update is packaged as a set of models and operation updates and sent down the query execution stack
* finally, the update is applied to database storage

A few things about this approach:



* it trades off writeback performance for chattiness - some portion of the messages will be double-communicated, and there may be extra overhead in mending the stack.
* As long as our failure detection is good enough, we could actually do it for any write and just fall back to the slower write naturally if the DB update fails.


#### Efficient Bulk Updates

Efficient bulk updates to data (e.g. removing all entities from a collection with a particular date range) can be supported as long as the data store can emulate CRDT semantics for the update. However, these look more like queries than standard entity or collection mutation. The syntax that would best be able to support this style of update, along with a number of other details, are open questions.


## What’s Next?

If this proposal gains traction, then there are a few clear next steps:



* write design docs and implementation plans for the changes mentioned in Level 1
* decide on what parts of the overall plan should be part of our Q2 planning
* decide which components (particularly from level 3 and above) are worth spending more design time on now / soon.

In particular, we don’t yet have solid designs for efficient filters & joins or entity patches, though I hope it’s clear how these fit into the overall design. I suspect we will want to spend a least a little time ensuring that we do have a better understanding of how to go about adding these features, so we can do the work when we need to.
