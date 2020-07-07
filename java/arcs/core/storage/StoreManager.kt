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

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.util.guardedBy
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Store manager provides a central holding places for the [Store] instances that a runtime will
 * use, so that only one instance of a [Store] can be created per [StorageKey].
 */
@ExperimentalCoroutinesApi
class StoreManager(
    /**
     * If a store doesn't yet exist in this [StoreManager] for a provided [StorageKey],
     * it will be created using this [ActivationFactory]
     */
    val activationFactory: ActivationFactory = defaultFactory
) {
    private val storesMutex = Mutex()
    private val stores by guardedBy(storesMutex, mutableMapOf<StorageKey, ActiveStore<*, *, *>>())

    @Suppress("UNCHECKED_CAST")
    suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
        storeOptions: StoreOptions
    ) = storesMutex.withLock {
        stores.getOrPut(storeOptions.storageKey) {
            activationFactory<Data, Op, T>(storeOptions)
        } as ActiveStore<Data, Op, T>
    }

    suspend fun waitForIdle() {
        storesMutex.withLock {
            stores.values.forEach { it.idle() }
        }
    }

    /**
     * Drops all [Store] instances.
     */
    suspend fun reset() = storesMutex.withLock { stores.clear() }
}
