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
import arcs.core.storage.ProxyMessage.ModelUpdate
import arcs.core.storage.ProxyMessage.Operations
import arcs.core.storage.ProxyMessage.SyncRequest
import arcs.core.storage.util.RandomProxyCallbackManager
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
class DirectStoreMuxer<Data : CrdtData, Op : CrdtOperation, T>(
    val storageKey: StorageKey,
    val backingType: Type,
    private val options: StoreOptions? = null
) {
    private val storeMutex = Mutex()
    private val log = TaggedLog { "DirectStoreMuxer" }
    private val proxyManager = RandomProxyCallbackManager<Data, Op, T>(
        "backing",
        Random
    )

    // TODO(b/158262634): Make this CacheMap Weak.
    /* internal */ val stores = LruCacheMap<String, StoreRecord<Data, Op, T>>(
        50,
        livenessPredicate = { _, sr -> !sr.store.closed }
    ) { muxId, sr -> closeStore(muxId, sr) }

    // Keeps track of all the stores a callbackId is registered to. Used when removing an
    // observer (off method), as that requires unregistering to each store it is registered with.
    private val callbackIdToMuxIdMap = mutableMapOf<Int, MutableSet<String>>()

    fun on(callback: ProxyCallback<Data, Op, T>, callbackToken: Int? = null): Int {
        synchronized(proxyManager) {
            val callbackId = proxyManager.register(callback, callbackToken)
            callbackIdToMuxIdMap[callbackId] = mutableSetOf()
            return callbackId
        }
    }

    fun off(callbackToken: Int) {
        for (muxId in callbackIdToMuxIdMap[callbackToken]!!) {
            val (idSet, store) = checkNotNull(stores[muxId]) { "store not found" }
            store.off(callbackToken)
            idSet.remove(callbackToken)
        }
        callbackIdToMuxIdMap.remove(callbackToken)
        synchronized(proxyManager) {
            proxyManager.unregister(callbackToken)
        }
    }

    /** Safely closes a [DirectStore] and cleans up its resources. */
    private fun closeStore(muxId: String, storeRecord: StoreRecord<*, *, *>) {
        if (!storeRecord.store.closed) {
            log.debug { "close the store($muxId)" }

            try {
                for (id in storeRecord.idSet) storeRecord.store.off(id)
            } catch (e: Exception) {
                // TODO(b/160251910): Make logging detail more cleanly conditional.
                log.debug(e) { "failed to close the store($muxId)" }
                log.info { "failed to close the store" }
            }
        }
    }

    /**
     * Gets data from the store corresponding to the given [muxId].
     */
    suspend fun getLocalData(muxId: String, id: Int): Data {
        val (idSet, store) = store(muxId)
        if (!idSet.contains(id)) registerToStore(id, muxId, idSet, store)

        return store.getLocalData()
    }
    /** Removes [DirectStore] caches and closes those that can be closed safely. */
    suspend fun clearStoresCache() = storeMutex.withLock {
        for ((muxId, sr) in stores) closeStore(muxId, sr)
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
     * Sends the provided [ProxyMessage] to the store backing the provided [muxId].
     *
     * A new store will be created for the [muxId], if necessary.
     */
    suspend fun onProxyMessage(
        message: ProxyMessage<Data, Op, T>
    ): Boolean {
        val muxId = message.muxId!!
        val (idSet, store) = store(muxId)

        if (!idSet.contains(message.id)) registerToStore(message.id!!, muxId, idSet, store)

        val deMuxedMessage: ProxyMessage<Data, Op, T> = when (message) {
            is SyncRequest -> SyncRequest(message.id)
            is ModelUpdate -> ModelUpdate(message.model, message.id)
            is Operations -> if (message.operations.isNotEmpty()) {
                Operations(message.operations, message.id)
            } else return true
        }
        return store.onProxyMessage(deMuxedMessage)
    }

    /* internal */ suspend fun setupStore(muxId: String): StoreRecord<Data, Op, T> {
        val store = DirectStore.create<Data, Op, T>(
            StoreOptions(
                storageKey = storageKey.childKeyWithComponent(muxId),
                type = backingType,
                coroutineScope = options?.coroutineScope
            )
        )

        // Return a new Record and add it to our local stores, keyed by muxId.
        return StoreRecord(mutableSetOf<Int>(), store)
    }

    @VisibleForTesting
    suspend fun registerToStore(
        id: Int,
        muxId: String,
        idSet: MutableSet<Int>,
        store: DirectStore<Data, Op, T>
    ) = storeMutex.withLock {
        if (!idSet.contains(id)) {
            store.on(
                ProxyCallback { message ->
                    proxyManager.getCallback(id)?.invoke(message.withMuxId(muxId))
                },
                id
            )
            idSet.add(id)
            callbackIdToMuxIdMap[id]?.add(muxId)
        }
    }

    @VisibleForTesting
    suspend fun store(id: String) = storeMutex.withLock {
        stores.getOrPut(id) {
            setupStore(id)
        }
    }

    data class StoreRecord<Data : CrdtData, Op : CrdtOperation, T>(
        val idSet: MutableSet<Int>,
        val store: DirectStore<Data, Op, T>
    )
}
