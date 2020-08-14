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
import kotlinx.coroutines.CoroutineScope

/** Base interface which all store implementations must extend from. */
interface IStore<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    val storageKey: StorageKey
    val type: Type
}

/** Wrapper for options which will be used to construct a [Store]. */
data class StoreOptions(
    val storageKey: StorageKey,
    val type: Type,
    val versionToken: String? = null,
    /**
     * The field is for internal use on [StorageService] and its subclasses to
     * plumb a [CoroutineScope] through storage stack on the service end.
     * It is not encapsulated in a parcel and should only be initialized on
     * [StorageService] and its subclasses.
     *
     * TODO: remove it completely and plumb service coroutine scope via
     * class constructor either as an independent parameter or a configuration
     * data class object.
     */
    val coroutineScope: CoroutineScope? = null
)
