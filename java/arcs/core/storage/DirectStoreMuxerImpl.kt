package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.util.randomCallbackManager
import arcs.core.type.Type
import arcs.core.util.LruCacheMap
import arcs.core.util.Random
import arcs.core.util.TaggedLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Concrete implementation of [DirectStoreMuxer]. */
class DirectStoreMuxerImpl<Data : CrdtData, Op : CrdtOperation, T>(
  override val storageKey: StorageKey,
  override val backingType: Type,
  private val scope: CoroutineScope,
  private val writeBackProvider: WriteBackProvider,
  private val devTools: DevToolsForStorage?
) : DirectStoreMuxer<Data, Op, T> {
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
  override val stores = LruCacheMap<String, DirectStoreMuxer.StoreRecord<Data, Op, T>>(
    50,
    livenessPredicate = { _, sr -> !sr.store.closed }
  ) { _, sr -> closeStore(sr) }

  /** Safely closes a [DirectStore] and cleans up its resources. */
  private fun closeStore(storeRecord: DirectStoreMuxer.StoreRecord<*, *, *>) {
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

  override fun on(callback: MuxedProxyCallback<Data, Op, T>): Int {
    return callbackManager.register(callback::invoke)
  }

  override fun off(token: Int) {
    callbackManager.unregister(token)
  }

  @Suppress("UNUSED_PARAMETER")
  override suspend fun getLocalData(referenceId: String, callbackId: Int): Data {
    return store(referenceId).store.getLocalData()
  }

  override suspend fun clearStoresCache() = storeMutex.withLock {
    for ((_, sr) in stores) closeStore(sr)
    stores.clear()
  }

  override suspend fun idle() {
    storeMutex.withLock {
      stores.values.toList()
    }.forEach {
      /**
       * If the overhead/wall-time of [DirectStore.idle] is longer than an
       * [CoroutineScope.launch] i.e. more than 5ms debounce time, launching
       * [DirectStore.idle]s in parallel can further help performance,
       */
      it.store.idle()
    }
  }

  override suspend fun onProxyMessage(muxedMessage: MuxedProxyMessage<Data, Op, T>) {
    val (id, store) = store(muxedMessage.muxId)
    val deMuxedMessage: ProxyMessage<Data, Op, T> = muxedMessage.message.withId(id)
    store.onProxyMessage(deMuxedMessage)
  }

  private suspend fun setupStore(referenceId: String): DirectStoreMuxer.StoreRecord<Data, Op, T> {
    val store = DirectStore.create<Data, Op, T>(
      StoreOptions(
        storageKey = storageKey.childKeyWithComponent(referenceId),
        type = backingType
      ),
      scope = scope,
      writeBackProvider = writeBackProvider,
      devTools = devTools
    )

    val id = store.on {
      callbackManager.send(MuxedProxyMessage(referenceId, it))
    }

    // Return a new Record and add it to our local stores, keyed by muxId.
    return DirectStoreMuxer.StoreRecord(id, store)
  }

  private suspend fun store(id: String): DirectStoreMuxer.StoreRecord<Data, Op, T> {
    return storeMutex.withLock {
      stores.getOrPut(id) {
        setupStore(id)
      }
    }
  }
}
