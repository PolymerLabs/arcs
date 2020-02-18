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
import arcs.core.storage.HandleCallbacks
import arcs.core.storage.HandleObserver
import arcs.core.storage.StorageProxy
import arcs.sdk.Entity
import arcs.sdk.ReadWriteCollection
import kotlinx.coroutines.runBlocking

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
) : SetBase<T>(name, storageProxy), HandleObserver {

    private val onUpdateActions: MutableList<(Set<T>) -> Unit> = mutableListOf()

    init {
        this.callback =  HandleCallbacks(this)
    }

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

    /** Assign a callback to run when the collection is Updated. */
    fun onUpdate(action: (Set<T>) -> Unit) {
        log.debug { "Register new callback" }
        onUpdateActions.add(action)
    }

    // Functions to to interface with Handle events.
    override suspend fun onUpdated() {
        val currentValue = fetchAll()
        onUpdateActions.forEach { action ->
            action(currentValue)
        }
    }
}

class CollectionWrapper<T>(
    private val wrapped: CollectionImpl<T>
) : ReadWriteCollection<T> where T : Referencable, T : Entity {

    override val name: String
        get() = wrapped.name

    override val size: Int
        get() = runBlocking {
            wrapped.size()
        }

    /** Returns true if the current storage proxy view of the collection is empty. */
    override fun isEmpty(): Boolean = runBlocking {
        wrapped.isEmpty()
    }

    /** Returns the values in the collection as a set. */
    override fun fetchAll(): Set<T> = runBlocking {
        wrapped.fetchAll()
    }

    /**
     * Store a new entity in the collection.
     *
     * It will be passed to the storage proxy in an add operation, with an incremented version
     * for this Handle in the version map.
     */
    override fun store(entity: T) = runBlocking {
        wrapped.store(entity)
    }

    /**
     * Clear all items from the collection.
     *
     * This currently works by iterating over all items in the storage proxy view of the
     * collection, and sending a Remove command for each one.
     */
    override fun clear() = runBlocking {
        wrapped.clear()
    }

    /**
     * Remove a given entity from the collection.
     *
     * The specified entity will be passed to the storage proxy in a remove operation.
     */
    override fun remove(entity: T) = runBlocking {
        wrapped.remove(entity)
    }

    /** Assign a callback to run when the collection is Updated. */
    override fun onUpdate(action: (Set<T>) -> Unit) {
        wrapped.onUpdate(action)
    }
}
