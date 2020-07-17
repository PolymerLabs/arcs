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
import arcs.core.type.Type

/** Base interface which all store implementations must extend from. */
interface IStore<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    val storageKey: StorageKey
    val type: Type
}

/** Wrapper for options which will be used to construct a [Store]. */
data class StoreOptions(
    val storageKey: StorageKey,
    val type: Type,
    val versionToken: String? = null
)
