/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage

import arcs.core.analytics.Analytics
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.VersionMap
import arcs.core.storage.StorageProxy.CallbackIdentifier
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import arcs.core.util.Time
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.getAndUpdate
import kotlinx.atomicfu.update
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

/** The default ReadWrite implementation of a [StorageProxy]. */
@Suppress("EXPERIMENTAL_API_USAGE")
class StorageProxyImpl<Data : CrdtData, Op : CrdtOperation, T> private constructor(
  override val storageKey: StorageKey,
  crdt: CrdtModel<Data, Op, T>,
  private val scheduler: Scheduler,
  private val time: Time,
  private val analytics: Analytics? = null
) : StorageProxy<Data, Op, T>, StorageProxyImplBase<Data, Op, T>(scheduler) {
  // Nullable internally, we don't allow constructor to pass null model
  private var _crdt: CrdtModel<Data, Op, T>? = crdt

  private val crdt: CrdtModel<Data, Op, T>
    get() = _crdt ?: throw IllegalStateException("StorageProxy closed")

  private val log = TaggedLog { "StorageProxy" }
  private val handleCallbacks = atomic(HandleCallbacks<T>())
  private val state = atomic(ProxyState.NO_SYNC)

  // Stash of operations to apply to the CRDT after we are synced with the store. These are
  // operations which have come in either before we were synced or while we were de-synced.
  private val modelOpsToApplyAfterSyncing = mutableListOf<Op>()

  private var firstUpdateSent = false
  private var lastSyncRequestTimestampMillis: Long? = null

  /* visible for testing */
  fun getStateForTesting(): ProxyState = state.value

  override fun closeInternal() {
    state.update { ProxyState.CLOSED }
    _crdt = null
  }

  override fun isClosed(): Boolean {
    return state.value == ProxyState.CLOSED
  }

  override fun prepareForSync() {
    checkNotClosed()
    state.update {
      if (it == ProxyState.NO_SYNC) {
        ProxyState.READY_TO_SYNC
      } else {
        it
      }
    }
  }

  override fun maybeInitiateSync() {
    checkNotClosed()
    var needsSync = false
    state.update {
      // TODO(b/157188866): remove reliance on ready signal for write-only handles in tests
      // If there are no readable handles observing this proxy, it will be in the NO_SYNC
      // state and will never deliver any onReady notifications, which breaks tests that
      // call awaitReady on write-only handles.
      if (it == ProxyState.READY_TO_SYNC || it == ProxyState.NO_SYNC) {
        needsSync = true
        ProxyState.AWAITING_SYNC
      } else {
        needsSync = false
        it
      }
    }
    // TODO: add timeout for stores that fail to sync
    if (needsSync) requestSynchronization()
  }

  override fun registerForStorageEvents(id: CallbackIdentifier, notify: (StorageEvent) -> Unit) {
    checkNotClosed()
    handleCallbacks.update { it.addNotify(id, notify) }
  }

  override fun setErrorCallbackForHandleEvents(callback: (Exception) -> Unit) {
    if (handleCallbacks.value.errorCallbackForHandleEvents == null) {
      handleCallbacks.update {
        it.apply { errorCallbackForHandleEvents = callback }
      }
    }
  }

  override fun addOnReady(id: CallbackIdentifier, action: () -> Unit) {
    checkNotClosed()
    checkWillSync()
    handleCallbacks.update { it.addOnReady(id, action) }
    if (state.value == ProxyState.SYNC) {
      scheduler.schedule(HandleCallbackTask(id, "onReady(immediate)", action))
    }
  }

  override fun addOnUpdate(id: CallbackIdentifier, action: (oldValue: T, newValue: T) -> Unit) {
    checkNotClosed()
    checkWillSync()
    handleCallbacks.update { it.addOnUpdate(id, action) }
  }

  override fun addOnDesync(id: CallbackIdentifier, action: () -> Unit) {
    checkNotClosed()
    checkWillSync()
    handleCallbacks.update { it.addOnDesync(id, action) }
    if (state.value == ProxyState.DESYNC) {
      scheduler.schedule(HandleCallbackTask(id, "onDesync(immediate)", action))
    }
  }

  override fun addOnResync(id: CallbackIdentifier, action: () -> Unit) {
    checkNotClosed()
    checkWillSync()
    handleCallbacks.update { it.addOnResync(id, action) }
  }

  override fun removeCallbacksForName(id: CallbackIdentifier) {
    handleCallbacks.update { it.removeCallbacks(id) }
  }

  @Suppress("DeferredIsResult")
  override fun applyOps(ops: List<Op>): Deferred<Boolean> {
    checkNotClosed()
    checkInDispatcher()
    log.verbose { "Applying operations: $ops" }

    val oldValue = crdt.consumerView
    ops.forEach { op ->
      if (!crdt.applyOperation(op)) return CompletableDeferred(false)
    }
    val newValue = crdt.consumerView

    // Let the store know about the op by piping it into our outgoing messages channel.
    val result = CompletableDeferred<Boolean>()
    sendMessageToStore(ProxyMessage.Operations(ops, null), result)

    // Don't send update notifications for local writes that occur prior to sync (these should
    // only be in onFirstStart and onStart, and as such particles aren't ready for updates yet).
    if (state.value in arrayOf(ProxyState.SYNC, ProxyState.DESYNC)) {
      // TODO: the returned Deferred doesn't account for this update propagation; should it?
      notifyUpdate(oldValue, newValue)
    }
    return result
  }

  override fun getVersionMap(): VersionMap = crdt.versionMap.copy()

  override fun getParticleViewUnsafe(): T {
    checkNotClosed()
    checkInDispatcher()
    log.debug { "Getting particle view (lifecycle)" }

    check(state.value in arrayOf(ProxyState.SYNC, ProxyState.DESYNC)) {
      "Read operations are not valid before onReady (storage proxy state is ${state.value})"
    }

    return crdt.consumerView
  }

  /**
   * Applies messages from a [ActiveStore].
   */
  suspend fun onMessage(message: ProxyMessage<Data, Op, T>) = coroutineScope {
    log.verbose { "onMessage: $message" }
    if (state.value == ProxyState.CLOSED) {
      log.verbose { "in closed state, received message: $message" }
      return@coroutineScope
    }

    if (message is ProxyMessage.SyncRequest) {
      // Storage wants our latest state.
      val data = withContext(this@StorageProxyImpl.dispatcher) { crdt.data }
      sendMessageToStore(ProxyMessage.ModelUpdate(data, null))
      return@coroutineScope
    }

    log.verbose { "onMessage: $message, scheduling handle" }
    scheduler.schedule(
      MessageFromStoreTask {
        when (message) {
          is ProxyMessage.ModelUpdate -> {
            maybeLogSyncRequestToModelUpdateLatency()
            processModelUpdate(message.model)
          }
          is ProxyMessage.Operations -> processModelOps(message.operations)
          else -> Unit
        }
      }
    )
  }

  private fun maybeLogSyncRequestToModelUpdateLatency() {
    analytics?.let {
      lastSyncRequestTimestampMillis?.let {
        analytics.logStorageLatency(
          time.currentTimeMillis - it,
          Analytics.storageKeyToStorageType(storageKey),
          Analytics.crdtModelToHandleType(crdt),
          Analytics.Event.SYNC_REQUEST_TO_MODEL_UPDATE
        )
      }
      lastSyncRequestTimestampMillis = null
    }
  }

  private fun processModelUpdate(model: Data) {
    log.verbose { "received model update (sync) for $storageKey" }

    // It's possible for the backing store to send us a model update before we request one (when
    // a different actor modifies the data in such a way as to require an update instead of a set
    // of operations). While we could use this to sync, we don't want to send ready notifications
    // until after maybeInitiateSync() has been called. Since this case is rare it's easiest to
    // just ignore the update and re-request it at the right time.
    val currentState = state.value // Atomic value can change between checks, so cache.
    if (currentState == ProxyState.READY_TO_SYNC || currentState == ProxyState.NO_SYNC) {
      log.verbose { "ignoring model update in $currentState, will be handled after ready state" }
      return
    }

    val oldValue = crdt.consumerView
    crdt.merge(model)

    val priorState = state.getAndUpdate { ProxyState.SYNC }
    when (priorState) {
      ProxyState.AWAITING_SYNC -> {
        notifyReady()
        applyPostSyncModelOps()
      }
      ProxyState.READY_TO_SYNC -> Unit // Unreachable; guarded above
      ProxyState.SYNC -> notifyUpdate(oldValue, crdt.consumerView)
      ProxyState.DESYNC -> {
        notifyResync()
        notifyUpdate(oldValue, crdt.consumerView)
        applyPostSyncModelOps()
      }
      ProxyState.NO_SYNC,
      ProxyState.CLOSED -> throw IllegalStateException(
        "received ModelUpdate on StorageProxy in state $priorState"
      )
    }
  }

  /**
   * Attempt to apply any model operations we observed while de-synced (or awaiting-sync).
   *
   * Note: this method should only be called from the scheduler's thread.
   */
  private fun applyPostSyncModelOps() {
    if (modelOpsToApplyAfterSyncing.isEmpty()) return

    val ops = modelOpsToApplyAfterSyncing.filter { it.versionMap.dominates(crdt.versionMap) }
    modelOpsToApplyAfterSyncing.clear()
    processModelOps(ops)
  }

  private fun processModelOps(operations: List<Op>) {
    // Queue-up ops we receive while we're not-synced.
    if (state.value != ProxyState.SYNC) {
      modelOpsToApplyAfterSyncing.addAll(operations)
      return
    }

    val oldValue = crdt.consumerView
    val couldApplyAllOps = operations.all { crdt.applyOperation(it) }

    if (!couldApplyAllOps) {
      state.update { ProxyState.DESYNC }

      log.info { "Could not apply ops, notifying onDesync listeners and requesting Sync." }
      notifyDesync()
      requestSynchronization()
    } else {
      log.debug { "Notifying onUpdate listeners" }
      notifyUpdate(oldValue, crdt.consumerView)
    }
  }

  private fun requestSynchronization() {
    log.verbose { "requesting sync for $storageKey" }
    sendMessageToStore(ProxyMessage.SyncRequest(null))
    analytics?.let {
      lastSyncRequestTimestampMillis = time.currentTimeMillis
    }
  }

  private fun notifyReady() {
    log.verbose { "notifying ready for $storageKey" }
    val tasks = handleCallbacks.value.let {
      buildCallbackTasks(handleCallbacks.value.onReady, "onReady") { it() } +
        buildCallbackTasks(handleCallbacks.value.notify, "notify(READY)") {
          it(StorageEvent.READY)
        }
    }
    if (tasks.isNotEmpty()) scheduler.schedule(tasks)
  }

  private fun notifyUpdate(oldValue: T, newValue: T) {
    // If this isn't our first update and the data's hashCode is equivalent to the old data's
    // hashCode, no need to send an update.
    if (firstUpdateSent && oldValue.hashCode() == newValue.hashCode()) return
    firstUpdateSent = true

    log.verbose { "notifying update for $storageKey" }
    val tasks = handleCallbacks.value.let {
      buildCallbackTasks(handleCallbacks.value.onUpdate, "onUpdate") {
        it(oldValue, newValue)
      } + buildCallbackTasks(handleCallbacks.value.notify, "notify(UPDATE)") {
        it(StorageEvent.UPDATE)
      }
    }
    if (tasks.isNotEmpty()) scheduler.schedule(tasks)
  }

  private fun notifyDesync() {
    log.verbose { "notifying desync for $storageKey" }
    val tasks = handleCallbacks.value.let {
      buildCallbackTasks(handleCallbacks.value.onDesync, "onDesync") { it() } +
        buildCallbackTasks(handleCallbacks.value.notify, "notify(DESYNC)") {
          it(StorageEvent.DESYNC)
        }
    }
    if (tasks.isNotEmpty()) scheduler.schedule(tasks)
  }

  private fun notifyResync() {
    log.verbose { "notifying resync for $storageKey" }
    val tasks = handleCallbacks.value.let {
      buildCallbackTasks(handleCallbacks.value.onResync, "onResync") { it() } +
        buildCallbackTasks(handleCallbacks.value.notify, "notify(RESYNC)") {
          it(StorageEvent.RESYNC)
        }
    }
    if (tasks.isNotEmpty()) scheduler.schedule(tasks)
  }

  /** Schedule [HandleCallbackTask]s for all given [callbacks] with the [Scheduler]. */
  private fun <FT : Function<Unit>> buildCallbackTasks(
    callbacks: Map<CallbackIdentifier, List<FT>>,
    callbackName: String,
    block: (FT) -> Unit
  ): List<Scheduler.Task> {
    return callbacks.entries.flatMap { (id, callbacks) ->
      callbacks.map { callback ->
        HandleCallbackTask(id, callbackName) {
          log.debug { "Executing callback for $id" }
          block(callback)
        }
      }
    }
  }

  private fun checkNotClosed() = check(state.value != ProxyState.CLOSED) {
    "Unexpected operation on closed StorageProxy"
  }

  private fun checkWillSync() = check(state.value != ProxyState.NO_SYNC) {
    "Action handlers are not valid on a StorageProxy that has not been set up to sync " +
      "(i.e. there are no readable handles observing this proxy)"
  }

  private class MessageFromStoreTask(block: () -> Unit) : Scheduler.Task.Processor(block)

  private class HandleCallbackTask(
    callbackIdentifier: CallbackIdentifier,
    private val callbackName: String,
    block: () -> Unit
  ) : Scheduler.Task.Listener(
    callbackIdentifier.namespace,
    callbackIdentifier.handleName,
    block
  ) {
    override fun toString(): String = "$callbackName#${hashCode()}"
  }

  private data class HandleCallbacks<T>(
    val onReady: Map<CallbackIdentifier, List<() -> Unit>> = emptyMap(),
    val onUpdate: Map<CallbackIdentifier, List<(T, T) -> Unit>> = emptyMap(),
    val onDesync: Map<CallbackIdentifier, List<() -> Unit>> = emptyMap(),
    val onResync: Map<CallbackIdentifier, List<() -> Unit>> = emptyMap(),
    val notify: Map<CallbackIdentifier, List<(StorageEvent) -> Unit>> = emptyMap(),
    var errorCallbackForHandleEvents: ((Exception) -> Unit)? = null
  ) {
    fun addOnReady(id: CallbackIdentifier, block: () -> Unit) =
      copy(onReady = onReady + (id to ((onReady[id] ?: emptyList()) + wrap(block))))

    fun addOnUpdate(id: CallbackIdentifier, block: (T, T) -> Unit) =
      copy(onUpdate = onUpdate + (id to ((onUpdate[id] ?: emptyList()) + wrapUpdate(block))))

    fun addOnDesync(id: CallbackIdentifier, block: () -> Unit) =
      copy(onDesync = onDesync + (id to ((onDesync[id] ?: emptyList()) + wrap(block))))

    fun addOnResync(id: CallbackIdentifier, block: () -> Unit) =
      copy(onResync = onResync + (id to ((onResync[id] ?: emptyList()) + wrap(block))))

    fun addNotify(id: CallbackIdentifier, block: (StorageEvent) -> Unit) =
      copy(notify = notify + (id to ((notify[id] ?: emptyList()) + block)))

    fun removeCallbacks(id: CallbackIdentifier) =
      copy(
        onReady = onReady - id,
        onUpdate = onUpdate - id,
        onDesync = onDesync - id,
        onResync = onResync - id,
        notify = notify - id
      )

    private fun wrap(block: () -> Unit): () -> Unit {
      return {
        try {
          block()
        } catch (e: Exception) {
          errorCallbackForHandleEvents?.invoke(e)
        }
      }
    }

    private fun wrapUpdate(block: (T, T) -> Unit): (T, T) -> Unit {
      return { t1, t2 ->
        try {
          block(t1, t2)
        } catch (e: Exception) {
          errorCallbackForHandleEvents?.invoke(e)
        }
      }
    }
  }

  // Visible for testing
  enum class ProxyState {
    /**
     * [prepareForSync] has not been called. Proxies that are only associated with
     * write-only handles will remain in this state.
     */
    NO_SYNC,

    /**
     * [prepareForSync] has been called to indicate that this proxy will be moving to
     * synchronized mode when [maybeInitiateSync] is called.
     */
    READY_TO_SYNC,

    /**
     * [maybeInitiateSync] has been called. A sync request has been sent to storage,
     * but the response has not been received yet.
     */
    AWAITING_SYNC,

    /**
     * The [StorageProxyImpl] is synchronized with its associated storage.
     */
    SYNC,

    /**
     * A set of model operations from storage failed to apply cleanly to the local CRDT model,
     * so the [StorageProxyImpl] is desynchronized. A request has been sent to resynchronize.
     */
    DESYNC,

    /**
     * The [StorageProxyImpl] has been closed; no further operations are possible, and no
     * messages from the store will be received.
     */
    CLOSED,
  }

  companion object {
    suspend fun <Data : CrdtData, Op : CrdtOperation, T> create(
      storeOptions: StoreOptions,
      storageEndpointManager: StorageEndpointManager,
      crdt: CrdtModel<Data, Op, T>,
      scheduler: Scheduler,
      time: Time,
      analytics: Analytics? = null
    ): StorageProxyImpl<Data, Op, T> {
      /**
       * Since [storageEndpointManager.get] is a suspending method, we need to be in a
       * suspending context in order to attach its callback.
       */
      return StorageProxyImpl(storeOptions.storageKey, crdt, scheduler, time, analytics).also {
        it.store = storageEndpointManager.get(storeOptions, it::onMessage)
      }
    }
  }
}
