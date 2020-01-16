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

package arcs.core.storage

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSet

/**
 * Collection Handle implementation for the JVM.
 *
 * It provides methods that can generate the appropriate operations to send to a
 * backing storage proxy.
 */
class CollectionImpl<T : Referencable>(
    name: String,
    storageProxy: StorageProxy<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>
) : Handle<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>(name, storageProxy),
    Iterable<T> {

    /** Return the number of items in the storage proxy view of the collection. */
    val size: Int
        get() = value.size

    /** Returns true if the current storage proxy view of the collection is empty*/
    fun isEmpty(): Boolean = value.isEmpty()

    /** Return in iterator over them items in then storage proxy view of the collection. */
    override fun iterator(): Iterator<T> = value.iterator()

    /** Store a new entity in the collection.
     *
     * It will be passed to the storage proxy in an add operation, with an incremented version
     * for this Handle in the version map.
     */
    fun store(entity: T) {
        versionMap.increment()
        storageProxy.applyOp(CrdtSet.Operation.Add(name, versionMap, entity))
        notifyListeners()
    }

    /** Clear all items from the collection.
     *
     * This currently works by iterating over all items in the storage proxy view of the
     * collection, and sending a Remove command for each one.
     */
    fun clear() {
        storageProxy.getParticleView().value.forEach {
            storageProxy.applyOp(CrdtSet.Operation.Remove(name, versionMap, it))
        }
        notifyListeners()
    }

    /** Remove a given entity from the collection.
     *
     * The specified entity will be passed to the storage proxy in a remove operation.
     */
    fun remove(entity: T) {
        storageProxy.applyOp(CrdtSet.Operation.Remove(name, versionMap, entity))
        notifyListeners()
    }
}
