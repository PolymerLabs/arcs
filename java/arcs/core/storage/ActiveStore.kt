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

/**
 * Representation of an *active* store.
 *
 * Subclasses of this must provide specific behavior as-controlled by the [StorageMode] provided
 * within the [StoreOptions].
 */
abstract class ActiveStore<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    options: StoreOptions
) : IStore<Data, Op, ConsumerData> {
    override val storageKey: StorageKey = options.storageKey
    override val type: Type = options.type
    open val versionToken: String? = options.versionToken

    /** Suspends until all pending operations are complete. */
    open suspend fun idle() = Unit

    /**
     * Registers a [ProxyCallback] with the store. A token will either be provided or generated
     * and returned. The token can be used to unregister the callback using [off].
     *
     * A callbackToken will only be provided by a storage component that wraps a store (as is the
     * case of a Direct Store Muxer wrapping a Direct Store). It is otherwise expected for the store
     * to generate the callbackToken.
     */
    abstract fun on(
        callback: ProxyCallback<Data, Op, ConsumerData>,
        callbackToken: Int? = null
    ): Int

    /** Unregisters a callback associated with the given [callbackToken]. */
    abstract fun off(callbackToken: Int)

    /** Handles a message from the storage proxy. */
    abstract suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>): Boolean

    /** Performs any operations that are needed to release resources held by this [ActiveStore]. */
    open fun close() = Unit
}
