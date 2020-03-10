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

package arcs.core.storage.ttl

import arcs.core.common.Referencable
import arcs.core.storage.handle.SetHandle
import arcs.core.storage.handle.SingletonHandle
import arcs.core.util.Time

/**
 * [RemovalManager] is a convenience for managing removal of entities or references from storage,
 * for example, removal of expired data.
 */
open class RemovalManager(val time: Time) {

    /** Removes all expired items from the given singleton handle. */
    suspend fun <T : Referencable> removeExpired(handle: SingletonHandle<T>) {
        val data = handle.fetch()
        if (data != null && data.expirationTimestamp > time.currentTimeMillis) {
            handle.clear()
        }
    }

    /** Removes all items newer than the given time from the given singleton handle. */
    suspend fun <T : Referencable> removeNewerThan(handle: SingletonHandle<T>, timeMillis: Long) {
        val data = handle.fetch()
        if (data != null && data.creationTimestamp > timeMillis) {
            handle.clear()
        }
    }

    /** Removes all expired items from the given collection handle. */
    suspend fun <T : Referencable> removeExpired(handle: SetHandle<T>) {
        val all = handle.fetchAll()
        val nowMillis = time.currentTimeMillis
        for (data in all) {
            if (data.expirationTimestamp > nowMillis) {
                // TODO: implement batch removal in CollectionImpl.kt
                handle.remove(data)
            }
        }
    }

    /** Removes all items newer than the given time from the given collection handle. */
    suspend fun <T : Referencable> removeNewerThan(handle: SetHandle<T>, timeMillis: Long) {
        val all = handle.fetchAll()
        for (data in all) {
            if (data.creationTimestamp > timeMillis) {
                // TODO: implement batch removal in CollectionImpl.kt
                handle.remove(data)
            }
        }
    }
}
