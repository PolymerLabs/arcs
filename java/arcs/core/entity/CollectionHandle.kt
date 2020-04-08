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
class CollectionHandle<T : Storable, R : Referencable>(
    name: String,
    spec: HandleSpec<out Entity>,
    /** Interface to storage for [RawEntity] objects backing an `entity: T`. */
    val storageProxy: CollectionProxy<R>,
    /** Will ensure that necessary fields are present on the [RawEntity] before storage. */
    val storageAdapter: StorageAdapter<T, R>,
    dereferencerFactory: EntityDereferencerFactory
) : BaseHandle<T>(name, spec, storageProxy, dereferencerFactory),
    ReadWriteQueryCollectionHandle<T, Any> {

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
    override suspend fun store(element: T) = checkPreconditions<Unit> {
        storageProxy.applyOp(
            CrdtSet.Operation.Add(
                name,
                storageProxy.getVersionMap().increment(name),
                storageAdapter.storableToReferencable(element)
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

    override suspend fun remove(element: T) = checkPreconditions<Unit> {
        storageProxy.applyOp(
            CrdtSet.Operation.Remove(
                name,
                storageProxy.getVersionMap(),
                storageAdapter.storableToReferencable(element)
            )
        )
    }
    // endregion

    // region implement ReadableHandle<T>
    override suspend fun onUpdate(action: suspend (Set<T>) -> Unit) =
        storageProxy.addOnUpdate(name) {
            action(adaptValues(it))
        }

    override suspend fun onDesync(action: () -> Unit) = storageProxy.addOnDesync(name, action)

    override suspend fun onResync(action: () -> Unit) = storageProxy.addOnResync(name, action)

    override suspend fun <E : Entity> createReference(entity: E): Reference<E> {
        val entityId = requireNotNull(entity.entityId) {
            "Entity must have an ID before it can be referenced."
        }
        fetchAll().let { data ->
            data.firstOrNull()?.let {
                require(it is Entity) {
                    "Handle must contain Entity-typed elements in order to create references."
                }
            }
            require(data.any { it is Entity && it.entityId == entityId }) {
                "Entity is not stored in the Collection."
            }
        }
        return createReferenceInternal(entity)
    }
    // endregion

    private fun adaptValues(values: Set<R>): Set<T> = values.mapTo(mutableSetOf()) {
        storageAdapter.referencableToStorable(it)
    }
}
