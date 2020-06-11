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
import arcs.core.type.Type
import arcs.core.util.LruCacheMap
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/**
 * An collection of [DirectStore]s that allows multiple CRDT models to be stored as sub-keys
 * of a single [StorageKey] location.
 *
 * This is what *backs* Entities.
 */
class BackingStore<Data : CrdtData, Op : CrdtOperation, T>(
    val storageKey: StorageKey,
    val backingType: Type,
    val callbackFactory: (String) -> ProxyCallback<Data, Op, T>
) {
    private val storeMutex = Mutex()
    // TODO(b/158262634): Make this CacheMap Weak.
    /* internal */ val stores = LruCacheMap<String, StoreRecord<Data, Op, T>>(
        50,
        livenessPredicate = { _, sr -> !sr.store.closed }
    ) { _, sr ->
        if (!sr.store.closed) {
            sr.store.close()
        }
    }

    /**
     * Gets data from the store corresponding to the given [referenceId].
     */
    suspend fun getLocalData(referenceId: String) = store(referenceId).store.getLocalData()

    suspend fun clearStoresCache() = storeMutex.withLock { stores.clear() }

    /** Calls [idle] on all existing contained stores and waits for their completion. */
    suspend fun idle() = storeMutex.withLock {
        stores.values.map {
            withContext(coroutineContext) {
                launch { it.store.idle() }
            }
        }.joinAll()
    }

    /**
     * Sends the provided [ProxyMessage] to the store backing the provided [referenceId].
     *
     * A new store will be created for the [referenceId], if necessary.
     */
    suspend fun onProxyMessage(
        message: ProxyMessage<Data, Op, T>,
        referenceId: String
    ): Boolean {
        val (id, store) = store(referenceId)
        val deMuxedMessage: ProxyMessage<Data, Op, T> = when (message) {
            is SyncRequest -> SyncRequest(id)
            is ModelUpdate -> ModelUpdate(message.model, id)
            is Operations -> if (message.operations.isNotEmpty()) {
                Operations(message.operations, id)
            } else return true
        }
        return store.onProxyMessage(deMuxedMessage)
    }

    /* internal */ suspend fun setupStore(referenceId: String): StoreRecord<Data, Op, T> {
        val store = DirectStore.create(
            StoreOptions<Data, Op, T>(
                storageKey = storageKey.childKeyWithComponent(referenceId),
                type = backingType
            )
        )

        val id = store.on(callbackFactory(referenceId))

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
