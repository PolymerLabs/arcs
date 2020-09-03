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

import androidx.annotation.VisibleForTesting
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.storage.ProxyMessage.ModelUpdate
import arcs.core.storage.ProxyMessage.Operations
import arcs.core.storage.ProxyMessage.SyncRequest
import arcs.core.storage.util.randomCallbackManager
import arcs.core.type.Type
import arcs.core.util.LruCacheMap
import arcs.core.util.Random
import arcs.core.util.TaggedLog
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * An collection of [DirectStore]s that allows multiple CRDT models to be stored as sub-keys
 * of a single [StorageKey] location.
 *
 * This is what *backs* Entities.
 */
class DirectStoreMuxer<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    val storageKey: StorageKey,
    val backingType: Type,
    private val options: StoreOptions? = null
) {
    private val storeMutex = Mutex()
    private val log = TaggedLog { "DirectStoreMuxer" }

    /**
     * Store a set of callbacks that will be fired for any of the underlying stores in this
     * [DirectStoreMuxer].
     */
    private val callbackManager = randomCallbackManager<MuxedProxyMessage<Data, Op, T>>(
        "direct-store-muxer",
        Random
    )

    // TODO(b/158262634): Make this CacheMap Weak.
    /* internal */ val stores = LruCacheMap<String, StoreRecord<Data, Op, T>>(
        50,
        livenessPredicate = { _, sr -> !sr.store.closed }
    ) { _, sr -> closeStore(sr) }

    /** Safely closes a [DirectStore] and cleans up its resources. */
    private fun closeStore(storeRecord: StoreRecord<*, *, *>) {
        if (!storeRecord.store.closed) {
            log.debug { "close the store(${storeRecord.id})" }

            try {
                storeRecord.store.close()
            } catch (e: Exception) {
                // TODO(b/160251910): Make logging detail more cleanly conditional.
                log.debug(e) { "failed to close the store(${storeRecord.id})" }
                log.info { "failed to close the store" }
            }
        }
    }

    /**
     * Register a callback with the [DirectStoreMuxer] that will receive callbacks for all
     * [DirectStore] instnaces that are currently active. The message will be wrapped in a
     * [MuxedProxyMessage] with [muxId] representing the [entityId] of the entity.
     */
    fun on(callback: MuxedProxyCallback<Data, Op, T>) {
        callbackManager.register(callback::invoke)
    }

    /**
     * Remove a previously-registered [MuxedProxyCallback] identified by the provided [token].
     */
    fun off(token: Int) {
        callbackManager.unregister(token)
    }

    /**
     * Gets data from the store corresponding to the given [referenceId].
     */
    suspend fun getLocalData(referenceId: String) = store(referenceId).store.getLocalData()

    /** Removes [DirectStore] caches and closes those that can be closed safely. */
    suspend fun clearStoresCache() = storeMutex.withLock {
        for ((_, sr) in stores) closeStore(sr)
        stores.clear()
    }

    /** Calls [idle] on all existing contained stores and waits for their completion. */
    suspend fun idle() = storeMutex.withLock {
        stores.values.toList()
    }.map {
        /**
         * If the overhead/wall-time of [DirectStore.idle] is longer than an
         * [CoroutineScope.launch] i.e. more than 5ms debounce time, launching
         * [DirectStore.idle]s in parallel can further help performance,
         */
        it.store.idle()
    }

    /**
     * Sends the provided [ProxyMessage] to the store backing the provided [referenceId].
     *
     * A new store will be created for the [referenceId], if necessary.
     */
    suspend fun onProxyMessage(
        message: ProxyMessage<Data, Op, T>,
        referenceId: String
    ) {
        val (id, store) = store(referenceId)
        val deMuxedMessage: ProxyMessage<Data, Op, T> = when (message) {
            is SyncRequest -> SyncRequest(id)
            is ModelUpdate -> ModelUpdate(message.model, id)
            is Operations -> if (message.operations.isNotEmpty()) {
                Operations(message.operations, id)
            } else return
        }
        store.onProxyMessage(deMuxedMessage)
    }

    /* internal */ suspend fun setupStore(referenceId: String): StoreRecord<Data, Op, T> {
        val store = DirectStore.create<Data, Op, T>(
            StoreOptions(
                storageKey = storageKey.childKeyWithComponent(referenceId),
                type = backingType,
                coroutineScope = options?.coroutineScope
            )
        )

        val id = store.on(ProxyCallback {
            callbackManager.send(MuxedProxyMessage(referenceId, it))
        })

        // Return a new Record and add it to our local stores, keyed by muxId.
        return StoreRecord(id, store)
    }

    @VisibleForTesting
    suspend fun store(id: String) = storeMutex.withLock {
        stores.getOrPut(id) {
            setupStore(id)
        }
    }

    data class StoreRecord<Data : CrdtData, Op : CrdtOperation, T>(
        val id: Int,
        val store: DirectStore<Data, Op, T>
    )
}
