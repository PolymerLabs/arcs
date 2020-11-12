package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.util.callbackManager
import arcs.core.type.Type
import arcs.core.util.LruCacheMap
import arcs.core.util.MutableBiMap
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
  private val driverFactory: DriverFactory,
  private val writeBackProvider: WriteBackProvider,
  private val devTools: DevToolsForStorage?
) : DirectStoreMuxer<Data, Op, T> {
  /**
   * [stateMutex] guards all accesses to the [DirectStoreMuxer]'s [callbackManager], [stores], and
   * [callbackIdToMuxIdMap].
   */
  private val stateMutex = Mutex()
  private val log = TaggedLog { "DirectStoreMuxer" }

  /**
   * Store a set of callbacks that will be fired for any of the underlying stores in this
   * [DirectStoreMuxer].
   */
  private val callbackManager = callbackManager<MuxedProxyMessage<Data, Op, T>>(
    "direct-store-muxer",
    Random
  )

  // TODO(b/158262634): Make this CacheMap Weak.
  override val stores = LruCacheMap<String, DirectStoreMuxer.StoreRecord<Data, Op, T>>(
    50,
    livenessPredicate = { _, sr -> !sr.store.closed }
  ) { muxId, sr -> closeStore(muxId, sr) }

  /**
   * Maps each [callbackId] managed by the [callbackManager] to a set of muxId's. The set of muxId's
   * represent the set of [DirectStore] instances with a callback associated to the [callbackId].
   *
   * The [callbackId] belongs to a listener that registered a callback to the [DirectStoreMuxer],
   * and the muxId's represent the set of stores that the listener has access to.
   */
  private val callbackIdToMuxIdMap = mutableMapOf<Int, MutableSet<String>>()

  /**
   * Safely closes a [DirectStore] and cleans up its resources.
   *
   * closeStore mutates state and therefore must only be callbed by a function that holds the
   * stateMutex.
   */
  private fun closeStore(muxId: String, storeRecord: DirectStoreMuxer.StoreRecord<*, *, *>) {
    if (!storeRecord.store.closed) {
      log.debug { "close the store($muxId)" }

      try {
        storeRecord.idMap.lefts
          .asSequence()
          .mapNotNull { callbackId -> callbackIdToMuxIdMap[callbackId] }
          .forEach { muxIdSet -> muxIdSet.remove(muxId) }
        storeRecord.idMap.clear()
        storeRecord.store.close()
      } catch (e: Exception) {
        // TODO(b/160251910): Make logging detail more cleanly conditional.
        log.debug(e) { "failed to close the store($muxId)" }
        log.info { "failed to close the store" }
      }
    }
  }

  override suspend fun on(callback: MuxedProxyCallback<Data, Op, T>): Int = stateMutex.withLock {
    val callbackId = callbackManager.register(callback::invoke)
    callbackIdToMuxIdMap[callbackId] = mutableSetOf()
    callbackId
  }

  override suspend fun off(callbackId: Int): Unit = stateMutex.withLock {
    callbackIdToMuxIdMap[callbackId]?.forEach { muxId ->
      val (idMap, store) = checkNotNull(stores[muxId]) { "store not found" }
      idMap.removeL(callbackId)?.let { callbackIdForStore -> store.off(callbackIdForStore) }
    }
    callbackIdToMuxIdMap.remove(callbackId)
    callbackManager.unregister(callbackId)
  }

  @Suppress("UNUSED_PARAMETER")
  override suspend fun getLocalData(referenceId: String, callbackId: Int): Data =
    getStore(referenceId, callbackId).store.getLocalData()

  override suspend fun clearStoresCache(): Unit = stateMutex.withLock {
    stores.forEach { (muxId, sr) -> closeStore(muxId, sr) }
    stores.clear()
  }

  override suspend fun idle() {
    stateMutex.withLock {
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

  override suspend fun onProxyMessage(
    muxedMessage: MuxedProxyMessage<Data, Op, T>
  ) {
    val messageId = requireNotNull(muxedMessage.message.id) { "messages must have an ID" }
    val (idMap, store) = getStore(muxedMessage.muxId, messageId)
    val messageIdForStore = requireNotNull(idMap.getR(messageId)) {
      "callback was not successfully registered to store."
    }
    val deMuxedMessage: ProxyMessage<Data, Op, T> = muxedMessage.message.withId(messageIdForStore)
    store.onProxyMessage(deMuxedMessage)
  }

  private suspend fun setupStore(referenceId: String): DirectStoreMuxer.StoreRecord<Data, Op, T> {
    val store = DirectStore.create<Data, Op, T>(
      StoreOptions(
        storageKey = storageKey.childKeyWithComponent(referenceId),
        type = backingType
      ),
      scope = scope,
      driverFactory = driverFactory,
      writeBackProvider = writeBackProvider,
      devTools = devTools
    )

    // Return a new Record and add it to our local stores, keyed by muxId.
    return DirectStoreMuxer.StoreRecord(MutableBiMap(), store)
  }

  override suspend fun getStore(
    muxId: String,
    callbackId: Int
  ): DirectStoreMuxer.StoreRecord<Data, Op, T> = stateMutex.withLock {
    val storeRecord = stores.getOrPut(muxId) { this.setupStore(muxId) }

    // Register `callbackId` with store if it is not already registered. It is necessary to register
    // a callback per id because when the DirectStoreMuxer receives a message from the DirectStore,
    // it utilizes the message id to determine which observer to redirect the message to.
    val callback = checkNotNull(callbackManager.getCallback(callbackId)) {
      "Callback id is not registered to the Direct Store Muxer."
    }

    if (!storeRecord.idMap.containsL(callbackId)) {
      val callbackIdForStore = storeRecord.store.on {
        callback.invoke(
          MuxedProxyMessage(muxId, it.withId(callbackId))
        )
      }
      storeRecord.idMap.put(callbackId, callbackIdForStore)
      callbackIdToMuxIdMap.getOrPut(callbackId) { mutableSetOf() }.add(muxId)
    }
    storeRecord
  }

  /**
   * Ensures the [callbackManager], [callbackIdToMuxIdMap] and [stores] maintain consistent state.
   * TODO (b/173041765) Remove the need for this method
   */
  suspend fun consistentState(): Boolean = stateMutex.withLock {
    // check stores are consistent with callbackManager and callbackIdToMuxIdMap
    for ((muxId, sr) in stores) {
      if (!callbackManager.activeTokens.containsAll(sr.idMap.lefts)) return false
      if (!sr.idMap.lefts.all { callbackIdToMuxIdMap[it]?.contains(muxId) == true }) return false
    }

    // check callbackIdToMuxIdMap is consistent with callbackManager and stores
    if (!callbackManager.activeTokens.containsAll(callbackIdToMuxIdMap.keys)) return false
    for ((id, muxIdSet) in callbackIdToMuxIdMap) {
      if (!muxIdSet.all { muxId -> stores[muxId]?.idMap?.containsL(id) == true }) return false
    }

    return true
  }
}
