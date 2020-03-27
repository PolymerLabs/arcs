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
import arcs.core.crdt.CrdtOperation
import java.util.concurrent.ConcurrentHashMap

/**
 * Store manager provides a central holding places for the [Store] instances that a runtime will
 * use, so that only one instance of a [Store] can be created per [StorageKey].
 */
class StoreManager {
    private val stores = ConcurrentHashMap<StorageKey, Store<*, *, *>>()

    /** Return a list of all [StorageKeys]s for [Store]s managed by this [StoreManager] */
    val storageKeys
        get() = stores.keys

    /** Get a [Store] for the provided key. One will be created if it does not exist yet. */
    @Suppress("UNCHECKED_CAST")
    fun <Data : CrdtData, Op : CrdtOperation, T> get(
        storeOptions: StoreOptions<Data, Op, T>
    ) = stores.getOrPut(storeOptions.storageKey) { Store(storeOptions) } as Store<Data, Op, T>
}
