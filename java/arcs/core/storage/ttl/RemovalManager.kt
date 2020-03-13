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
import arcs.core.data.TimeRange
import arcs.core.storage.handle.CollectionHandle
import arcs.core.storage.handle.SingletonHandle
import arcs.core.util.Time

/**
 * [RemovalManager] is a convenience for managing removal of entities or references from storage,
 * for example, removal of expired data.
 */
abstract class RemovalManager(val time: Time) {
    /** Removes all expired items from the given singleton handle. */
    suspend fun <T : Referencable> removeExpired(handle: SingletonHandle<T>) {
        handle.fetch()?.takeIf { it.expirationTimestamp < time.currentTimeMillis }
            ?.let { handle.clear() }
    }

    /** Removes all items newer than the given time from the given singleton handle. */
    suspend fun <T : Referencable> removeCreatedBetween(
        handle: SingletonHandle<T>,
        timeRange: TimeRange
    ) {
        handle.fetch()?.takeIf { timeRange.inRange(it.creationTimestamp) }?.let {
            handle.clear()
        }
    }

    /** Removes all expired items from the given collection handle. */
    suspend fun <T : Referencable> removeExpired(handle: CollectionHandle<T>) {
        val nowMillis = time.currentTimeMillis
        handle.fetchAll().forEach {
            it.takeIf { it.expirationTimestamp < nowMillis }?.let { handle.remove(it) }
        }
    }

    /** Removes all items newer than the given time from the given collection handle. */
    suspend fun <T : Referencable> removeCreatedBetween(
        handle: CollectionHandle<T>,
        timeRange: TimeRange
    ) {
        handle.fetchAll().forEach {
            it.takeIf { timeRange.inRange(it.creationTimestamp) }?.apply { handle.remove(it) }
        }
    }
}
