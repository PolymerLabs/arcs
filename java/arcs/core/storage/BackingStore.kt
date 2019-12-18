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
import arcs.core.storage.ProxyMessage.ModelUpdate
import arcs.core.storage.ProxyMessage.Operations
import arcs.core.storage.ProxyMessage.SyncRequest
import arcs.core.storage.util.ProxyCallbackManager
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
class BackingStore(
    private val options: StoreOptions<CrdtData, CrdtOperation, Any?>
) : ActiveStore<CrdtData, CrdtOperation, Any?>(options) {
    private val storeMutex = Mutex()
    /* internal */ val stores = mutableMapOf<String, StoreRecord>()
    private val callbacks = ProxyCallbackManager<CrdtData, CrdtOperation, Any?>()

    @Deprecated(
        "Use getLocalData(muxId) instead",
        replaceWith = ReplaceWith("getLocalData(muxId)")
    )
    override suspend fun getLocalData(): CrdtData =
        throw UnsupportedOperationException("Use getLocalData(muxId) instead.")

    /**
     * Gets data from the store corresponding to the given [muxId].
     */
    suspend fun getLocalData(muxId: String): CrdtData {
        val record = storeMutex.withLock { stores[muxId] }
            ?: return setupStore(muxId).store.getLocalData()
        return record.store.getLocalData()
    }

    override fun on(callback: ProxyCallback<CrdtData, CrdtOperation, Any?>): Int =
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

    override suspend fun onProxyMessage(message: ProxyMessage<CrdtData, CrdtOperation, Any?>) =
        throw UnsupportedOperationException("Use onProxyMessage(message, muxId) instead.")

    suspend fun onProxyMessage(
        message: ProxyMessage<CrdtData, CrdtOperation, Any?>,
        muxId: String
    ): Boolean {
        val (id, store) = storeMutex.withLock { stores[muxId] } ?: setupStore(muxId)
        val deMuxedMessage: ProxyMessage<CrdtData, CrdtOperation, Any?> = when (message) {
            is SyncRequest -> SyncRequest(id)
            is ModelUpdate -> ModelUpdate(message.model, id)
            is Operations -> if (message.operations.isNotEmpty()) {
                Operations(message.operations, id)
            } else return true
        }
        return store.onProxyMessage(deMuxedMessage)
    }

    @Suppress("UNCHECKED_CAST") // TODO: See if we can clean up this generics situation.
    /* internal */ suspend fun setupStore(muxId: String): StoreRecord {
        val store = DirectStore.CONSTRUCTOR(
            // Copy of our options, but with a child storage key using the muxId.
            options.copy(options.storageKey.childKeyWithComponent(muxId))
        ) as DirectStore

        val id = store.on(ProxyCallback { processStoreCallback(muxId, it) })

        // Return a new Record and add it to our local stores, keyed by muxId.
        return StoreRecord(id, store)
            .also { record -> storeMutex.withLock { stores[muxId] = record } }
    }

    private suspend fun processStoreCallback(
        muxId: String,
        message: ProxyMessage<CrdtData, CrdtOperation, Any?>
    ) = callbacks.sendMultiplexed(message, muxId)

    data class StoreRecord(val id: Int, val store: DirectStore)

    companion object {
        @Suppress("UNCHECKED_CAST")
        val CONSTRUCTOR = StoreConstructor<CrdtData, CrdtOperation, Any?> {
            BackingStore(it as StoreOptions<CrdtData, CrdtOperation, Any?>)
        }
    }
}
