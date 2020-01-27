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

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.internal.VersionMap
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageCommunicationEndpoint

/** ValueAndVersion is a tuple of a value of some type and a [VersionMap] provided from its [StorageProxy]. */
data class ValueAndVersion<T>(val value: T, val versionMap: VersionMap)

/**
 * StorageProxy is an intermediary between a [Handle] and the [Store] that the [Handle] wants to
 * communicate with. It also maintains a local copy of the backing [CrdtModel].
 *
 * The current implementation doesn't communicate with a storage backend, it's just a basic wrapper
 * around a CRDT to move [Handle] implementation forward.
 *
 * TODO: Connect to storage
 * TODO: Bridge to SDK Handles
 *
 * @param T the consumer data type for the model behind this proxy
 * @property model a concrete instance of the [CrdtModel] the proxy will use to keep a local copy.
 * @constructor creates a new storage proxy using the provided model instance
 */
class StorageProxy<Data : CrdtData, Op : CrdtOperation, T>(
    private val model: CrdtModel<Data, Op, T>,
    private val store: StorageCommunicationEndpoint<Data, Op, T>
) {
    private val versionMap = VersionMap()

    /**
     * Return the current local version of the model, as well as the current associated version
     * map for the data.
     */
    fun getParticleView() = ValueAndVersion(model.consumerView, versionMap.copy())

    /**
     * Apply a CRDT operation to the [CrdtModel] that this [StorageProxy] manages.
     */
    suspend fun applyOp(op: Op) {
        model.applyOperation(op)
        store.onProxyMessage(ProxyMessage.Operations(operations = listOf(op)))
    }
}
