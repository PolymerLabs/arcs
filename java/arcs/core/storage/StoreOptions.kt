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
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type

/**
 * Modes for Storage.
 */
enum class StorageMode {
    /**
     * Mode where the [Store] directly accesses data in a backing [Driver] located by the store's
     * [StorageKey].
     */
    Direct,
    /**
     * Mode where the [Store] acts as a multiplexed accessor of data kept in child stores using
     * [Direct].
     */
    Backing,
    /**
     * Mode where the [Store] handles creating references and de-referencing them when manipulating
     * [CrdtSingleton] or [CrdtSet] objects containing [RawEntity]s.
     */
    ReferenceMode,
}

/** Wrapper for options which will be used to construct a [Store]. */
data class StoreOptions<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    val storageKey: StorageKey,
    val type: Type,
    val mode: StorageMode =
        if (storageKey is ReferenceModeStorageKey) StorageMode.ReferenceMode
        else StorageMode.Direct,
    val baseStore: IStore<Data, Op, ConsumerData>? = null,
    val versionToken: String? = null,
    val model: Data? = null
)
