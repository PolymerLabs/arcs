/*
 * Copyright 2019 Google LLC.
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

/** Base interface which all store implementations must extend from. */
interface IStore<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    val storageKey: StorageKey
    val mode: StorageMode
    val type: Type
}

/**
 * Modes for Storage.
 *
 * TODO: need actual, helpful kdoc for these.
 */
enum class StorageMode {
    Direct,
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
    val versionToken: String? = null
)
