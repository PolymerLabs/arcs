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
import arcs.core.storage.Handle
import arcs.core.storage.StorageProxy

/** These typealiases are defined to clean up the class declaration below. */
typealias SetProxy<T> = StorageProxy<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>
typealias SetBase<T> = Handle<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>

/**
 * Collection Handle implementation for the runtime.
 *
 * It provides methods that can generate the appropriate operations to send to a
 * backing storage proxy.
 */
class CollectionImpl<T : Referencable>(
    name: String,
    storageProxy: SetProxy<T>
) : SetBase<T>(name, storageProxy) {
    /** Return the number of items in the storage proxy view of the collection. */
    suspend fun size(): Int = value().size

    /** Returns true if the current storage proxy view of the collection is empty. */
    suspend fun isEmpty(): Boolean = value().isEmpty()

    /** Returns the values in the collection as a set. */
    suspend fun fetchAll(): Set<T> = value()

    /**
     * Store a new entity in the collection.
     *
     * It will be passed to the storage proxy in an add operation, with an incremented version
     * for this Handle in the version map.
     */
    suspend fun store(entity: T) {
        log.debug { "Storing: $entity" }
        versionMap.increment()
        storageProxy.applyOp(CrdtSet.Operation.Add(name, versionMap, entity))
    }

    /**
     * Clear all items from the collection.
     *
     * This currently works by iterating over all items in the storage proxy view of the
     * collection, and sending a Remove command for each one.
     */
    suspend fun clear() {
        log.debug { "Clearing" }
        storageProxy.getParticleView().value.forEach {
            storageProxy.applyOp(CrdtSet.Operation.Remove(name, versionMap, it))
        }
    }

    /**
     * Remove a given entity from the collection.
     *
     * The specified entity will be passed to the storage proxy in a remove operation.
     */
    suspend fun remove(entity: T) {
        log.debug { "Removing $entity" }
        storageProxy.applyOp(CrdtSet.Operation.Remove(name, versionMap, entity))
    }
}
