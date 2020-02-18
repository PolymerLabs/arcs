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
import arcs.core.crdt.CrdtSingleton
import arcs.core.storage.Handle
import arcs.core.storage.HandleCallbacks
import arcs.core.storage.HandleObserver
import arcs.core.storage.StorageProxy
import arcs.sdk.Entity
import arcs.sdk.ReadWriteSingleton
import kotlinx.coroutines.runBlocking

/** These typealiases are defined to clean up the class declaration below. */
typealias SingletonProxy<T> =
    StorageProxy<CrdtSingleton.Data<T>, CrdtSingleton.IOperation<T>, T?>
typealias SingletonBase<T> =
    Handle<CrdtSingleton.Data<T>, CrdtSingleton.IOperation<T>, T?>

/**
 * Singleton [Handle] implementation for the runtime.
 *
 * It provides methods that can generate the appropriate operations to send to a
 * backing [StorageProxy].
 */
class SingletonImpl<T : Referencable>(
    name: String,
    storageProxy: SingletonProxy<T>
) : SingletonBase<T>(name, storageProxy), HandleObserver {
    private val onUpdateActions: MutableList<(T) -> Unit> = mutableListOf()

    init {
        this.callback =  HandleCallbacks(this)
    }
    /** Get the current value from the backing [StorageProxy]. */
    suspend fun fetch() = value()

    /** Send a new value to the backing [StorageProxy]. */
    suspend fun set(entity: T) {
        versionMap.increment()
        storageProxy.applyOp(CrdtSingleton.Operation.Update(name, versionMap, entity))
    }

    /** Clear the value from the backing [StorageProxy]. */
    suspend fun clear() {
        // Sync before clearing in order to get an updated versionMap. This ensures we can clear
        // values set by other actors.
        fetch()
        storageProxy.applyOp(CrdtSingleton.Operation.Clear(name, versionMap))
    }

    /** Assign a callback to run when the singleton is Updated. */
    fun onUpdate(action: (T) -> Unit) {
        onUpdateActions.add(action)
    }

    // Functions to to interface with Handle events.
    override fun onUpdated() = runBlocking {
        val currentValue = fetch()
        if (currentValue != null) {
            onUpdateActions.forEach { action ->
                action(currentValue)
            }
        }
    }
}

class SingletonWrapper<T>(
    private val wrapped: SingletonImpl<T>
) : ReadWriteSingleton<T> where T : Referencable, T : Entity {
    override val name: String
        get() = wrapped.name

    /** Get the current value from the backing [StorageProxy]. */
    override fun fetch() = runBlocking {
        wrapped.fetch()
    }

    /** Send a new value to the backing [StorageProxy]. */
    override fun set(entity: T) = runBlocking {
        wrapped.set(entity)
    }

    /** Clear the value from the backing [StorageProxy]. */
    override fun clear() = runBlocking {
        wrapped.clear()
    }

    /** Assign a callback to run when the singleton is Updated. */
    override fun onUpdate(action: (T?) -> Unit) {
        wrapped.onUpdate(action)
    }
}
