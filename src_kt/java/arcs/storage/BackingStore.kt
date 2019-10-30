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

package arcs.storage

import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation
import arcs.storage.BackingStore.StoreRecord.Pending
import arcs.storage.BackingStore.StoreRecord.Record
import arcs.storage.ProxyMessage.ModelUpdate
import arcs.storage.ProxyMessage.Operations
import arcs.storage.ProxyMessage.SyncRequest
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlin.coroutines.coroutineContext

/**
 * An [ActiveStore] that allows multiple CRDT models to be stored as sub-keys of a single
 * storageKey location.
 */
class BackingStore(
  private val options: StoreOptions<CrdtData, CrdtOperation, Any?>
) : ActiveStore<CrdtData, CrdtOperation, Any?>(options) {
  private val defaultScope = CoroutineScope(Dispatchers.Default)
  private val stores = atomic(mapOf<String, StoreRecord>())
  private val callbacks = atomic(mapOf<Int, ProxyCallback<CrdtData, CrdtOperation, Any?>>())
  private val nextCallbackToken = atomic(1)

  override val localData: CrdtData
    get() = throw UnsupportedOperationException("Use getLocalData(muxId) instead.")

  /**
   * Gets data from the store corresponding to the given [muxId].
   *
   * @param coroutineScope Optional coroutine scope on which to place new [Pending] values'
   *   [CompletableDeferred]s on. *Most useful in tests.*
   */
  fun getLocalData(muxId: String, coroutineScope: CoroutineScope = defaultScope): CrdtData? {
    var result: CrdtData? = null
    stores.update { stores ->
      val store = stores[muxId]
      when (store) {
        // Nothing yet, add a pending record.
        null -> stores + (muxId to Pending(CompletableDeferred(coroutineScope.job)))
        is Record -> {
          result = store.store.localData
          stores
        }
        // Must be pending, nothing to do.
        else -> stores
      }
    }
    return result
  }

  override fun on(callback: ProxyCallback<CrdtData, CrdtOperation, Any?>): Int {
    val token = nextCallbackToken.getAndIncrement()
    callbacks.update { it + (token to callback) }
    return token
  }

  override fun off(callbackToken: Int) {
    callbacks.update { it - callbackToken }
  }

  override suspend fun idle() = coroutineScope {
    stores.value.values.mapNotNull {
      (it as? Record)?.store?.let {
        launch { it.idle() }
      }
    }.joinAll()
  }

  override suspend fun onProxyMessage(message: ProxyMessage<CrdtData, CrdtOperation, Any?>) =
    throw UnsupportedOperationException("Use onProxyMessage(message, muxId) instead.")

  suspend fun onProxyMessage(
    message: ProxyMessage<CrdtData, CrdtOperation, Any?>,
    muxId: String
  ): Boolean {
    val storeRecord = stores.value[muxId] ?: setupStore(muxId)

    val resolvedRecord = when (storeRecord) {
      is Record -> storeRecord
      is Pending -> storeRecord.deferred.await()
    }

    val (id, store) = resolvedRecord
    val deMuxedMessage: ProxyMessage<CrdtData, CrdtOperation, Any?> = when (message) {
      is SyncRequest -> SyncRequest(id)
      is ModelUpdate -> ModelUpdate(message.model, id)
      is Operations -> Operations(message.operations, id)
    }
    return store.onProxyMessage(deMuxedMessage)
  }

  @Suppress("UNCHECKED_CAST") // TODO: See if we can clean up this generics situation.
  private suspend fun setupStore(muxId: String): Record {
    val store = DirectStore.CONSTRUCTOR(
      // Copy of our options, but with a child storage key using the muxId.
      options.copy(options.storageKey.childKeyWithComponent(muxId))
    ) as DirectStore
    val id = store.on(ProxyCallback { processStoreCallback(muxId, it) })

    // Return a new Record and add it to our local stores, keyed by muxId.
    return Record(id, store).also { record -> stores.update { it + (muxId to record) } }
  }

  private suspend fun processStoreCallback(
    muxId: String,
    message: ProxyMessage<CrdtData, CrdtOperation, Any?>
  ) = callbacks.value.values.all { it(message, muxId) }

  internal sealed class StoreRecord(open val type: StoreRecordType) {
    data class Record(
      val id: Int,
      val store: DirectStore
    ) : StoreRecord(StoreRecordType.Record)

    data class Pending(
      val deferred: CompletableDeferred<Record>
    ) : StoreRecord(StoreRecordType.Pending)
  }

  internal enum class StoreRecordType {
    Record, Pending
  }

  private val CoroutineScope.job: Job?
    get() = coroutineContext[Job.Key]

  companion object {
    @Suppress("UNCHECKED_CAST")
    val CONSTRUCTOR = StoreConstructor<CrdtData, CrdtOperation, Any?> {
      BackingStore(it as StoreOptions<CrdtData, CrdtOperation, Any?>)
    }
  }
}
