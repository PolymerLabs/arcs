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
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.Ttl
import arcs.core.storage.ActivationFactory
import arcs.core.storage.Callbacks
import arcs.core.storage.Dereferencer
import arcs.core.storage.Handle
import arcs.core.storage.StorageProxy
import arcs.core.storage.StoreOptions
import arcs.core.util.Time

/** These typealiases are defined to clean up the class declaration below. */
typealias SingletonProxy<T> = StorageProxy<SingletonData<T>, SingletonOp<T>, T?>
typealias SingletonBase<T> = Handle<SingletonData<T>, SingletonOp<T>, T?>
typealias SingletonData<T> = CrdtSingleton.Data<T>
typealias SingletonOp<T> = CrdtSingleton.IOperation<T>
typealias SingletonStoreOptions<T> = StoreOptions<SingletonData<T>, SingletonOp<T>, T?>
typealias SingletonHandle<T> = SingletonImpl<T>
typealias SingletonActivationFactory<T> = ActivationFactory<SingletonData<T>, SingletonOp<T>, T?>
typealias SingletonCallbacks<T> = Callbacks<SingletonData<T>, SingletonOp<T>, T?>

/**
 * Singleton [Handle] implementation for the runtime.
 *
 * It provides methods that can generate the appropriate operations to send to a
 * backing [StorageProxy].
 */
class SingletonImpl<T : Referencable>(
    name: String,
    val schema: Schema,
    storageProxy: SingletonProxy<T>,
    callbacks: SingletonCallbacks<T>? = null,
    ttl: Ttl = Ttl.Infinite,
    time: Time,
    canRead: Boolean = true,
    dereferencer: Dereferencer<RawEntity>? = null
) : SingletonBase<T>(
    name,
    storageProxy,
    callbacks,
    ttl,
    time,
    canRead,
    dereferencer = dereferencer
) {
    /** Get the current value from the backing [StorageProxy]. */
    suspend fun fetch() = value()

    /**
     * Sends a new value to the backing [StorageProxy]. If this returns `false`, your operation
     * did not apply fully. Fetch the latest value and retry.
     * */
    suspend fun store(entity: T): Boolean {
        @Suppress("GoodTime") // use Instant
        entity.creationTimestamp = requireNotNull(time).currentTimeMillis
        if (entity is RawEntity && !schema.refinement(entity)) {
            throw IllegalArgumentException(
                "Invalid entity stored to handle $name (failed refinement)"
            )
        }
        if (!Ttl.Infinite.equals(ttl)) {
            @Suppress("GoodTime") // use Instant
            entity.expirationTimestamp = ttl.calculateExpiration(time)
        }
        return storageProxy.applyOp(
            CrdtSingleton.Operation.Update(
                name,
                versionMap().increment(),
                entity
            )
        )
    }

    /**
     * Clears the value in the backing [StorageProxy]. If this returns `false`, your operation
     * did not apply fully. Fetch the latest value and retry.
     * */
    suspend fun clear(): Boolean {
        // Sync before clearing in order to get an updated versionMap. This ensures we can clear
        // values set by other actors.
        fetch()
        return storageProxy.applyOp(
            CrdtSingleton.Operation.Clear(name, versionMap())
        )
    }
}
