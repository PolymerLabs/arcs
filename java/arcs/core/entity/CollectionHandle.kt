/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.entity

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSet
import arcs.core.data.RawEntity
import arcs.core.storage.StorageProxy
import arcs.core.storage.StoreOptions
import arcs.core.storage.referencemode.ReferenceModeStorageKey

typealias CollectionData<T> = CrdtSet.Data<T>
typealias CollectionOp<T> = CrdtSet.IOperation<T>
typealias CollectionStoreOptions<T> = StoreOptions<CollectionData<T>, CollectionOp<T>, Set<T>>
typealias CollectionProxy<T> = StorageProxy<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>

/**
 * This class implements all of the methods that are needed by the various collection [Handle]
 * interfaces:
 * * [Handle]
 * * [ReadableHandle<T>]
 * * [ReadCollectionHandle<T>]
 * * [WriteCollectionHandle<T>]
 * * [ReadWriteCollectionHandle<T>]
 * * [QueryCollectionHandle<T>]
 * * [ReadQueryCollectionHandle<T>]
 * * [ReadWriteQueryCollectionHandle<T>]
 *
 * It manages the storage and retrieval of items of the specified [Entity] type, including
 * their conversion to and from the backing [RawEntity] type that the storage layer requires.
 *
 * This class won't be returned directly; instead it will be wrapped in a facade object that
 * exposes only the methods that should be exposed.
 */
class CollectionHandle<T : HandleContent>(
    name: String,
    spec: HandleSpec<out Entity>,
    /** Interface to storage for [RawEntity] objects backing an `entity: T`. */
    val storageProxy: CollectionProxy<out Referencable>,
    /** Will ensure that necessary fields are present on the [RawEntity] before storage. */
    val storageAdapter: StorageAdapter<T>,
    /** Provides logic to fetch [RawEntity] object backing a [Reference] field. */
    val dereferencerFactory: EntityDereferencerFactory
) : BaseHandle<T>(name, spec, storageProxy), ReadWriteQueryCollectionHandle<T, Any> {

    init {
        check(spec.containerType == HandleContainerType.Collection)
    }

    // region implement ReadCollectionHandle<T>
    override suspend fun size() = fetchAll().size

    override suspend fun isEmpty() = fetchAll().isEmpty()

    override suspend fun fetchAll() = checkPreconditions {
        adaptValues(storageProxy.getParticleView())
    }
    // endregion

    // region implement QueryCollectionHandle<T, Any>
    override suspend fun query(args: Any): Set<T> = checkPreconditions {
        (spec.entitySpec.SCHEMA.query?.let { query ->
            storageProxy.getParticleView().filter {
                check(it is RawEntity) { "Queries only work with Entity-typed Handles." }
                query(it, args)
            }.toSet()
        } ?: emptySet()).let { adaptValues(it) }
    }
    // endregion

    // region implement WriteCollectionHandle<T>
    override suspend fun store(entity: T) = checkPreconditions<Unit> {
        storageProxy.applyOp(
            CrdtSet.Operation.Add(
                name,
                storageProxy.getVersionMap().increment(name),
                storageAdapter.toStorage(entity)
            )
        )
    }

    override suspend fun clear() = checkPreconditions<Unit> {
        storageProxy.getParticleView().forEach {
            storageProxy.applyOp(
                CrdtSet.Operation.Remove(
                    name,
                    storageProxy.getVersionMap(),
                    it
                )
            )
        }
    }

    override suspend fun remove(entity: T) = checkPreconditions<Unit> {
        storageProxy.applyOp(
            CrdtSet.Operation.Remove(
                name,
                storageProxy.getVersionMap(),
                storageAdapter.toStorage(entity)
            )
        )
    }
    // endregion

    // region implement ReadableHandle<T>
    override suspend fun onUpdate(action: suspend (Set<T>) -> Unit) =
        storageProxy.addOnUpdate(name) {
            action(adaptValues(it))
        }
    // endregion

    private fun adaptValues(values: Set<Referencable>) = values.mapTo(mutableSetOf()) {
        storageAdapter.fromStorage(it)
    }
}
