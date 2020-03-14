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
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtOperation
import arcs.core.data.ReferenceType
import arcs.core.storage.ProxyMessage.ModelUpdate
import arcs.core.storage.ProxyMessage.Operations
import arcs.core.storage.ProxyMessage.SyncRequest
import arcs.core.storage.util.RandomProxyCallbackManager
import arcs.core.util.Random
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/**
 * An [ActiveStore] that allows multiple CRDT models to be stored as sub-keys of a single
 * storageKey location.
 *
 * This is what *backs* Entities.
 */
class BackingStore<Data : CrdtData, Op : CrdtOperation, T>(
    private val options: StoreOptions<Data, Op, T>
) : ActiveStore<Data, Op, T>(options) {
    private val storeMutex = Mutex()
    /* internal */ val stores = mutableMapOf<String, StoreRecord<Data, Op, T>>()
    private val callbacks = RandomProxyCallbackManager<Data, Op, T>(
        "backing",
        Random
    )

    @Deprecated(
        "Use getLocalData(muxId) instead",
        replaceWith = ReplaceWith("getLocalData(muxId)")
    )
    override suspend fun getLocalData(): Data =
        throw UnsupportedOperationException("Use getLocalData(muxId) instead.")

    /**
     * Gets data from the store corresponding to the given [muxId].
     */
    suspend fun getLocalData(muxId: String): Data {
        val record = storeMutex.withLock { stores[muxId] }
            ?: return setupStore(muxId).store.getLocalData()
        return record.store.getLocalData()
    }

    override fun on(callback: ProxyCallback<Data, Op, T>): Int =
        callbacks.register(callback)

    override fun off(callbackToken: Int) {
        callbacks.unregister(callbackToken)
    }

    override suspend fun idle() = storeMutex.withLock {
        stores.values.map {
            withContext(coroutineContext) {
                launch { it.store.idle() }
            }
        }.joinAll()
    }

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>) =
        throw UnsupportedOperationException("Use onProxyMessage(message, muxId) instead.")

    suspend fun onProxyMessage(
        message: ProxyMessage<Data, Op, T>,
        muxId: String
    ): Boolean {
        val (id, store) = storeMutex.withLock { stores[muxId] } ?: setupStore(muxId)
        val deMuxedMessage: ProxyMessage<Data, Op, T> = when (message) {
            is SyncRequest -> SyncRequest(id)
            is ModelUpdate -> ModelUpdate(message.model, id)
            is Operations -> if (message.operations.isNotEmpty()) {
                Operations(message.operations, id)
            } else return true
        }
        return store.onProxyMessage(deMuxedMessage)
    }

    @Suppress("UNCHECKED_CAST") // TODO: See if we can clean up this generics situation.
    /* internal */ suspend fun setupStore(muxId: String): StoreRecord<Data, Op, T> {
        val store = DirectStore.CONSTRUCTOR(
            // Copy of our options, but with a child storage key using the muxId.
            options.copy(options.storageKey.childKeyWithComponent(muxId)),
            dataClass = when (val type = options.type) {
                is CrdtModelType<*, *, *> -> type.crdtModelDataClass
                is ReferenceType<*> -> when (val contained = type.containedType) {
                    is CrdtModelType<*, *, *> -> contained.crdtModelDataClass
                    else -> throw UnsupportedOperationException(
                        "Unsupported contained type: $contained"
                    )
                }
                else -> throw UnsupportedOperationException("Unsupported type: $type")
            }
        ) as DirectStore<Data, Op, T>

        val id = store.on(ProxyCallback { processStoreCallback(muxId, it) })

        // Return a new Record and add it to our local stores, keyed by muxId.
        return StoreRecord(id, store)
            .also { record -> storeMutex.withLock { stores[muxId] = record } }
    }

    private suspend fun processStoreCallback(
        muxId: String,
        message: ProxyMessage<Data, Op, T>
    ) = callbacks.sendMultiplexed(message, muxId)

    data class StoreRecord<Data : CrdtData, Op : CrdtOperation, T>(
        val id: Int,
        val store: DirectStore<Data, Op, T>
    )

    companion object {
        @Suppress("UNCHECKED_CAST")
        val CONSTRUCTOR = StoreConstructor<CrdtData, CrdtOperation, Any?> { options, _ ->
            BackingStore(options as StoreOptions<CrdtData, CrdtOperation, Any?>)
        }
    }
}
