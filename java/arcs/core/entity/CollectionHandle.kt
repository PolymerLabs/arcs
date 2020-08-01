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
import kotlinx.coroutines.Job

typealias CollectionProxy<T> = StorageProxy<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>

/**
 * This class implements all of the methods that are needed by the various collection [Handle]
 * interfaces:
 * * [Handle]
 * * [ReadableHandle]
 * * [ReadCollectionHandle]
 * * [WriteCollectionHandle]
 * * [ReadWriteCollectionHandle]
 * * [QueryCollectionHandle]
 * * [ReadQueryCollectionHandle]
 * * [ReadWriteQueryCollectionHandle]
 *
 * It manages the storage and retrieval of items of the specified [Entity] type, including
 * their conversion to and from the backing [RawEntity] type that the storage layer requires.
 *
 * This class won't be returned directly; instead it will be wrapped in a facade object that
 * exposes only the methods that should be exposed.
 */
class CollectionHandle<T : Storable, R : Referencable>(
    config: Config<T, R>
) : BaseHandle<T>(config), ReadWriteQueryCollectionHandle<T, Any> {
    private val storageProxy = config.proxy
    private val storageAdapter = config.storageAdapter

    init {
        check(spec.containerType == HandleContainerType.Collection)
    }

    // region implement ReadCollectionHandle<T>

    // Use fetchAll to filter out expired items.
    override fun size() = fetchAll().size

    // Use fetchAll to filter out expired items.
    override fun isEmpty() = fetchAll().isEmpty()

    override fun fetchAll() = checkPreconditions {
        adaptValues(storageProxy.getParticleViewUnsafe())
    }
    // endregion

    // region implement QueryCollectionHandle<T, Any>
    override fun query(args: Any): Set<T> = checkPreconditions {
        (spec.entitySpecs.single().SCHEMA.query?.let { query ->
            storageProxy.getParticleViewUnsafe().filter {
                val entity = checkNotNull(it as? RawEntity) {
                    "Queries only work with Entity-typed Handles."
                }
                query(entity, args)
            }.toSet()
        } ?: emptySet()).let { adaptValues(it) }
    }
    // endregion

    // region implement WriteCollectionHandle<T>
    override fun store(element: T): Job = checkPreconditions {
        storageProxy.applyOp(
            CrdtSet.Operation.Add(
                name,
                storageProxy.getVersionMap().increment(name),
                storageAdapter.storableToReferencable(element)
            )
        )
    }

    override fun clear(): Job = checkPreconditions {
        storageProxy.applyOp(CrdtSet.Operation.Clear(name, storageProxy.getVersionMap()))
    }

    override fun remove(element: T): Job = checkPreconditions {
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
    override fun onUpdate(action: (CollectionDelta<T>) -> Unit) =
        storageProxy.addOnUpdate(callbackIdentifier) { oldValue, newValue ->
            val oldIds = oldValue.mapTo(mutableSetOf()) { it.id }
            val newIds = newValue.mapTo(mutableSetOf()) { it.id }
            val added = newValue.filterTo(mutableSetOf()) { it.id !in oldIds }
            val removed = oldValue.filterTo(mutableSetOf()) { it.id !in newIds }
            action(CollectionDelta(adaptValues(added), adaptValues(removed)))
        }

    override fun onDesync(action: () -> Unit) =
        storageProxy.addOnDesync(callbackIdentifier, action)

    override fun onResync(action: () -> Unit) =
        storageProxy.addOnResync(callbackIdentifier, action)

    override suspend fun <E : Entity> createReference(entity: E): Reference<E> {
        val entityId = requireNotNull(entity.entityId) {
            "Entity must have an ID before it can be referenced."
        }

        requireNotNull(
            /**
             * [referencableToStorable] deserialization is expensive.
             * Traverse and match in order is much cheaper than deserialize all then look up.
             *
             * Reverse traversal can further expedite some use-cases i.e.
             * store-then-createReference-immediately from time complexity O(N) to O(1).
             */
            storageProxy.getParticleViewUnsafe().reversed().firstOrNull {
                when (val maybeEntity = storageAdapter.referencableToStorable(it)) {
                    is Entity -> !storageAdapter.isExpired(maybeEntity) && entityId == entityId
                    else -> false
                }
            }
        ) { "Entity is not stored in the Collection." }

        return createReferenceInternal(entity)
    }
    // endregion

    private fun adaptValues(values: Set<R>): Set<T> = values.map() {
        storageAdapter.referencableToStorable(it)
    }.filterNotTo(mutableSetOf()) {
        storageAdapter.isExpired(it)
    }

    /** Configuration required to instantiate a [CollectionHandle]. */
    class Config<T : Storable, R : Referencable>(
        /** See [BaseHandleConfig.name]. */
        name: String,
        /** See [BaseHandleConfig.spec]. */
        spec: HandleSpec,
        /**
         * Interface to storage for [RawEntity] objects backing an `entity: T`.
         *
         * See [BaseHandleConfig.storageProxy].
         */
        val proxy: CollectionProxy<R>,
        /** Will ensure that necessary fields are present on the [RawEntity] before storage. */
        val storageAdapter: StorageAdapter<T, R>,
        /** See [BaseHandleConfig.dereferencerFactory]. */
        dereferencerFactory: EntityDereferencerFactory,
        /** See [BaseHandleConfig.particleId]. */
        particleId: String
    ) : BaseHandleConfig(name, spec, proxy, dereferencerFactory, particleId)
}
