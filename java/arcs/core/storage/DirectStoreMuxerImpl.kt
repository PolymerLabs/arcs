package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.util.callbackManager
import arcs.core.type.Type
import arcs.core.util.LruCacheMap
import arcs.core.util.LruCacheMap.TtlConfig
import arcs.core.util.MutableBiMap
import arcs.core.util.Random
import arcs.core.util.TaggedLog
import arcs.core.util.Time
import arcs.flags.BuildFlags
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

private const val DEFAULT_LRU_TTL_MILLIS = 60 * 1000L // 60 seconds

/** Concrete implementation of [DirectStoreMuxer]. */
class DirectStoreMuxerImpl<Data : CrdtData, Op : CrdtOperation, T>(
  override val storageKey: StorageKey,
  override val backingType: Type,
  private val scope: CoroutineScope,
  private val driverFactory: DriverFactory,
  private val writeBackProvider: WriteBackProvider,
  private val devTools: DevToolsForStorage?,
  val time: Time
) : DirectStoreMuxer<Data, Op, T> {
  /**
   * [stateMutex] guards all accesses to the [DirectStoreMuxer]'s [callbackManager], [stores], and
   * [callbackTokenToMuxIdMap].
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

  private fun ttlConfig(): TtlConfig {
    return if (BuildFlags.DIRECT_STORE_MUXER_LRU_TTL) {
      TtlConfig(ttlMilliseconds = DEFAULT_LRU_TTL_MILLIS, time::currentTimeMillis)
    } else {
      TtlConfig()
    }
  }

  override val stores = LruCacheMap<String, DirectStoreMuxer.StoreRecord<Data, Op, T>>(
    50,
    ttlConfig = ttlConfig(),
    livenessPredicate = { _, sr -> !sr.store.closed }
  ) { muxId, sr -> closeStore(muxId, sr) }

  /**
   * Maps each [CallbackToken] managed by the [callbackManager] to a set of muxId's. The set of
   * muxId's represent the set of [DirectStore] instances with a callback associated to the
   * [CallbackToken].
   *
   * The [CallbackToken] belongs to a listener that registered a callback to the [DirectStoreMuxer],
   * and the muxId's represent the set of stores that the listener has access to.
   */
  private val callbackTokenToMuxIdMap = mutableMapOf<CallbackToken, MutableSet<String>>()

  /**
   * Safely closes a [DirectStore] and cleans up its resources.
   *
   * closeStore mutates state and therefore must only be called by a function that holds the
   * stateMutex.
   */
  private fun closeStore(muxId: String, storeRecord: DirectStoreMuxer.StoreRecord<*, *, *>) {
    if (!storeRecord.store.closed) {
      log.debug { "close the store($muxId)" }

      try {
        storeRecord.tokenMap.lefts
          .asSequence()
          .mapNotNull { callbackToken -> callbackTokenToMuxIdMap[callbackToken] }
          .forEach { muxIdSet -> muxIdSet.remove(muxId) }
        storeRecord.tokenMap.clear()
        storeRecord.store.close()
      } catch (e: Exception) {
        // TODO(b/160251910): Make logging detail more cleanly conditional.
        log.debug(e) { "failed to close the store($muxId)" }
        log.info { "failed to close the store" }
      }
    }
  }

  override suspend fun on(callback: MuxedProxyCallback<Data, Op, T>): CallbackToken {
    return stateMutex.withLock {
      val callbackToken = callbackManager.register(callback::invoke)
      callbackTokenToMuxIdMap[callbackToken] = mutableSetOf()
      callbackToken
    }
  }

  override suspend fun off(callbackToken: CallbackToken): Unit = stateMutex.withLock {
    callbackTokenToMuxIdMap[callbackToken]?.forEach { muxId ->
      val (tokenMap, store) = checkNotNull(stores[muxId]) { "store not found" }
      tokenMap.removeL(callbackToken)?.let { callbackTokenForStore ->
        store.off(callbackTokenForStore)
      }
    }
    callbackTokenToMuxIdMap.remove(callbackToken)
    callbackManager.unregister(callbackToken)
  }

  @Suppress("UNUSED_PARAMETER")
  override suspend fun getLocalData(muxId: String, callbackToken: CallbackToken): Data =
    getStore(muxId, callbackToken).store.getLocalData()

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
    val (tokenMap, store) = getStore(muxedMessage.muxId, messageId)
    val callbackTokenForStore = requireNotNull(tokenMap.getR(messageId)) {
      "callback was not successfully registered to store."
    }
    val deMuxedMessage: ProxyMessage<Data, Op, T> =
      muxedMessage.message.withId(callbackTokenForStore)
    store.onProxyMessage(deMuxedMessage)
  }

  private suspend fun setupStore(muxId: String): DirectStoreMuxer.StoreRecord<Data, Op, T> {
    val store = DirectStore.create<Data, Op, T>(
      StoreOptions(
        storageKey = storageKey.newKeyWithComponent(muxId),
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
    callbackToken: CallbackToken
  ): DirectStoreMuxer.StoreRecord<Data, Op, T> = stateMutex.withLock {
    val storeRecord = stores.getOrPut(muxId) { this.setupStore(muxId) }

    // The given [CallbackToken] is a client-facing [CallbackToken]. In order to get the store
    // there needs to be a corresponding [CallbackToken] that is store-facing. If no such mapping
    // exists, then register a new callback to the store in order to create the corresponding
    // store-facing [CallbackToken].
    // This one-to-one mapping of client-facing [CallbackToken] to store-facing [CallbackToken] is
    // necessary because when the [DirectStoreMuxer] receives a message from the [DirectStore], it
    // utilises the message id as the [CallbackToken] to redirect the message to the right client.
    val callback = checkNotNull(callbackManager.getCallback(callbackToken)) {
      "Callback token is not registered to the Direct Store Muxer."
    }

    if (!storeRecord.tokenMap.containsL(callbackToken)) {
      val callbackTokenForStore = storeRecord.store.on {
        callback.invoke(
          MuxedProxyMessage(muxId, it.withId(callbackToken))
        )
      }
      storeRecord.tokenMap.put(callbackToken, callbackTokenForStore)
      callbackTokenToMuxIdMap.getOrPut(callbackToken) { mutableSetOf() }.add(muxId)
    }
    storeRecord
  }

  /**
   * Ensures the [callbackManager], [callbackTokenToMuxIdMap] and [stores] maintain consistent
   * state.
   * TODO (b/173041765) Remove the need for this method
   */
  suspend fun consistentState(): Boolean = stateMutex.withLock {
    // check stores are consistent with callbackManager and callbackIdToMuxIdMap
    for ((muxId, sr) in stores) {
      if (!callbackManager.activeTokens.containsAll(sr.tokenMap.lefts)) return false
      if (!sr.tokenMap.lefts.all { callbackTokenToMuxIdMap[it]?.contains(muxId) == true }) {
        return false
      }
    }

    // check callbackIdToMuxIdMap is consistent with callbackManager and stores
    if (!callbackManager.activeTokens.containsAll(callbackTokenToMuxIdMap.keys)) return false
    for ((callbackToken, muxIdSet) in callbackTokenToMuxIdMap) {
      if (!muxIdSet.all { muxId -> stores[muxId]?.tokenMap?.containsL(callbackToken) == true }) {
        return false
      }
    }

    return true
  }
}
