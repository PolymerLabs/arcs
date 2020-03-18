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

package arcs.core.storage.handle

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSet
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.Ttl
import arcs.core.storage.Dereferencer
import arcs.core.storage.Handle
import arcs.core.storage.StorageProxy
import arcs.core.storage.StoreOptions
import arcs.core.util.Time

/** These typealiases are defined to clean up the class declaration below. */
typealias CollectionData<T> = CrdtSet.Data<T>
typealias CollectionOp<T> = CrdtSet.IOperation<T>
typealias CollectionStoreOptions<T> = StoreOptions<CollectionData<T>, CollectionOp<T>, Set<T>>
typealias CollectionProxy<T> = StorageProxy<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>
typealias CollectionBase<T> = Handle<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>

/**
 * Collection Handle implementation for the runtime.
 *
 * It provides methods that can generate the appropriate operations to send to a
 * backing storage proxy.
 */
class CollectionHandle<T : Referencable>(
    name: String,
    storageProxy: CollectionProxy<T>,
    ttl: Ttl = Ttl.Infinite,
    time: Time,
    dereferencer: Dereferencer<RawEntity>? = null,
    private val schema: Schema? = null
) : CollectionBase<T>(
    name,
    storageProxy,
    ttl,
    time,
    dereferencer = dereferencer
) {
    /** Return the number of items in the storage proxy view of the collection. */
    suspend fun size(): Int = value().size

    /** Returns true if the current storage proxy view of the collection is empty. */
    suspend fun isEmpty(): Boolean = value().isEmpty()

    /** Returns the values in the collection as a set. */
    suspend fun fetchAll(): Set<T> = run {
        checkNotClosed()
        value()
    }

    /** Returns the values in the collection that fit the requirement (as a set). */
    suspend fun query(args: Any): Set<T> {
        checkNotClosed()

        val results = value().filter {
            require(it is RawEntity) {
                "Cannot query non entity typed collection $name"
            }
            val query = requireNotNull(schema?.query) {
                "Attempted to query collection $name with no associated query."
            }
            query(it, args)
        }
        return results.toSet()
    }

    /**
     * Store a new entity in the collection.
     *
     * It will be passed to the storage proxy in an add operation, with an incremented version
     * for this Handle in the version map.
     *
     * If this returns `false`, your change was not fully applied due to stale state or an invalid
     * operation (such as removing a non-existent entity from a collection). You should fetch the
     * latest value of the handle and retry if your change still makes sense on the updated value.
     */
    suspend fun store(entity: T): Boolean {
        log.debug { "Storing: $entity" }
        checkNotClosed()

        @Suppress("GoodTime") // use Instant
        entity.creationTimestamp = requireNotNull(time).currentTimeMillis
        require(entity !is RawEntity || schema == null || schema.refinement(entity)) {
            "Invalid entity stored to handle $name (failed refinement)"
        }
        if (!Ttl.Infinite.equals(ttl)) {
            @Suppress("GoodTime") // use Instant
            entity.expirationTimestamp = ttl.calculateExpiration(time)
        }
        return storageProxy.applyOp(
            CrdtSet.Operation.Add(name, versionMap().increment(), entity)
        )
    }

    /**
     * Clear all items from the collection.
     *
     * This currently works by iterating over all items in the storage proxy view of the
     * collection, and sending a Remove command for each one.
     *
     * If this returns `false`, your change was not fully applied due to stale state or an invalid
     * operation (such as removing a non-existent entity from a collection). You should fetch the
     * latest value of the handle and retry if your change still makes sense on the updated value.
     */
    suspend fun clear(): Boolean {
        log.debug { "Clearing" }
        checkNotClosed()

        return storageProxy.getParticleView().all {
            storageProxy.applyOp(
                CrdtSet.Operation.Remove(name, versionMap(), it)
            )
        }
    }

    /**
     * Remove a given entity from the collection.
     *
     * The specified entity will be passed to the storage proxy in a remove operation.
     *
     * If this returns `false`, your change was not fully applied due to stale state or an invalid
     * operation (such as removing a non-existent entity from a collection). You should fetch the
     * latest value of the handle and retry if your change still makes sense on the updated value.
     */
    suspend fun remove(entity: T): Boolean {
        log.debug { "Removing $entity" }
        checkNotClosed()

        return storageProxy.applyOp(
            CrdtSet.Operation.Remove(name, versionMap(), entity)
        )
    }
}
