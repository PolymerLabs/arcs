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
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.VersionMap
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.getAndUpdate
import kotlinx.atomicfu.update
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ConflatedBroadcastChannel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.buffer
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/**
 * [StorageProxy] is an intermediary between a [Handle] and [Store]. It provides up-to-date CRDT
 * state to readers, and ensures write operations apply cleanly before forwarding to the store.
 *
 * @param T the consumer data type for the model behind this proxy
 * @param initialCrdt the CrdtModel instance [StorageProxy] will apply ops to.
 */
@Suppress("EXPERIMENTAL_API_USAGE")
class StorageProxy<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    storeEndpointProvider: StorageCommunicationEndpointProvider<Data, Op, T>,
    crdt: CrdtModel<Data, Op, T>,
    private val scheduler: Scheduler
) {
    // Nullable internally, we don't allow constructor to pass null model
    private var _crdt: CrdtModel<Data, Op, T>? = crdt

    private val crdt: CrdtModel<Data, Op, T>
        get() = _crdt ?: throw IllegalStateException("StorageProxy closed")

    /**
     * If you need to interact with the data managed by this [StorageProxy], and you're not a
     * [Store], you must either be performing your interactions within a handle callback or on this
     * [CoroutineDispatcher].
     */
    val dispatcher: CoroutineDispatcher
        get() = scheduler.asCoroutineDispatcher()

    /** Identifier of the data this [StorageProxy] is managing. */
    val storageKey: StorageKey = storeEndpointProvider.storageKey

    private val log = TaggedLog { "StorageProxy" }
    private val handleCallbacks = atomic(HandleCallbacks<T>())
    private val stateHolder = atomic(StateHolder<T>(ProxyState.NO_SYNC))
    private val store: StorageCommunicationEndpoint<Data, Op, T> =
        storeEndpointProvider.getStorageEndpoint(ProxyCallback(::onMessage))

    private val outgoingMessagesChannel =
        Channel<Pair<ProxyMessage<Data, Op, T>, CompletableDeferred<Boolean>>>(Channel.UNLIMITED)
    private val outgoingMessagesInFlight = atomic(0)
    private val busySendingMessagesChannel = ConflatedBroadcastChannel(false)

    init {
        // Send messages generated by applyOp to the Store in the order in which they were received
        // by:
        //
        // 1. Calling store.onProxyMessage() with the message for each message.
        // 2. Buffering those calls so they happen in parallel/pipelined-with calling store.idle()
        // 3. Once the store is self-identifying as idle, complete the deferred which was generated
        //    at the same time as the message (and was returned to the caller)
        outgoingMessagesChannel.consumeAsFlow()
            .map { (message, deferredToComplete) ->
                log.debug { "Sending operations to store" }
                store.onProxyMessage(message)
                log.debug { "Operations sent to store" }
                deferredToComplete
            }
            .buffer()
            .onEach {
                // TODO(jasonwyatt): Make the deferred lazy, so that we only idle when the client
                //  requests it, we could probably just use the busySendingMessagesChannel thinger.

                val success = withTimeoutOrNull(5000) { store.idle() }
                if (success == null) {
                    log.warning {
                        "Timeout exceeded (5 seconds) while waiting for store to become idle."
                    }
                }
                it.complete(true)

                val queueLength = outgoingMessagesInFlight.getAndDecrement()
                log.debug { "Store went idle with outgoing queue length: $queueLength" }
                if (queueLength == 1) {
                    busySendingMessagesChannel.send(false)
                }
            }
            .flowOn(Dispatchers.Default)
            .launchIn(scheduler.scope)
    }

    /**
     * Suspends the coroutine while the [store] is busy processing our "outgoing messages".
     */
    suspend fun awaitOutgoingMessageQueueDrain() {
        busySendingMessagesChannel.asFlow().debounce(50).filter { !it }.first()
    }

    /* visible for testing */
    fun getStateForTesting(): ProxyState = stateHolder.value.state

    /**
     * If the [StorageProxy] is associated with any readable handles, it will need to operate
     * in synchronized mode. This is done via a two-step process:
     *   1) When constructed, all readable handles call this method to move the proxy from its
     *      initial state of [NO_SYNC] to [READY_TO_SYNC].
     *   2) [EntityHandleManager] then triggers the actual sync request after the arc has been
     *      set up and all particles have received their onStart events.
     */
    fun prepareForSync() {
        checkNotClosed()
        stateHolder.update {
            if (it.state == ProxyState.NO_SYNC) {
                it.setState(ProxyState.READY_TO_SYNC)
            } else {
                it
            }
        }
    }

    /**
     * If the [StorageProxy] has previously been set up for synchronized mode, send a sync request
     * to the backing store and move to [AWAITING_SYNC].
     */
    fun maybeInitiateSync() {
        checkNotClosed()
        var needsSync = false
        stateHolder.update {
            // TODO(b/157188866): remove reliance on ready signal for write-only handles in tests
            // If there are no readable handles observing this proxy, it will be in the NO_SYNC
            // state and will never deliver any onReady notifications, which breaks tests that
            // call awaitReady on write-only handles.
            if (it.state == ProxyState.READY_TO_SYNC || it.state == ProxyState.NO_SYNC) {
                needsSync = true
                it.setState(ProxyState.AWAITING_SYNC)
            } else {
                needsSync = false
                it
            }
        }
        // TODO: add timeout for stores that fail to sync
        if (needsSync) requestSynchronization()
    }

    /**
     * [AbstractArcHost] calls this (via [Handle]) to thread storage events back
     * to the [ParticleContext], which manages the [Particle] lifecycle API.
     */
    fun registerForStorageEvents(id: CallbackIdentifier, notify: (StorageEvent) -> Unit) {
        checkNotClosed()
        handleCallbacks.update { it.addNotify(id, notify) }
    }

    /**
     * Add a [Handle] `onReady` action associated with a [Handle] name.
     *
     * If the [StorageProxy] is synchronized when the action is added, it will be called
     * on the next iteration of the [Scheduler].
     */
    fun addOnReady(id: CallbackIdentifier, action: () -> Unit) {
        checkNotClosed()
        checkWillSync()
        handleCallbacks.update { it.addOnReady(id, action) }
        if (stateHolder.value.state == ProxyState.SYNC) {
            scheduler.schedule(HandleCallbackTask(id, "onReady(immediate)", action))
        }
    }

    /**
     * Add a [Handle] `onUpdate` action associated with a [Handle] name.
     */
    fun addOnUpdate(id: CallbackIdentifier, action: (value: T) -> Unit) {
        checkNotClosed()
        checkWillSync()
        handleCallbacks.update { it.addOnUpdate(id, action) }
    }

    /**
     * Add a [Handle] `onDesync` action associated with a [Handle] name.
     *
     * If the [StorageProxy] is desynchronized when the action is added, it will be called
     * on the next iteration of the [Scheduler].
     */
    fun addOnDesync(id: CallbackIdentifier, action: () -> Unit) {
        checkNotClosed()
        checkWillSync()
        handleCallbacks.update { it.addOnDesync(id, action) }
        if (stateHolder.value.state == ProxyState.DESYNC) {
            scheduler.schedule(HandleCallbackTask(id, "onDesync(immediate)", action))
        }
    }

    /**
     * Add a [Handle] `onResync` action associated with a [Handle] name.
     */
    fun addOnResync(id: CallbackIdentifier, action: () -> Unit) {
        checkNotClosed()
        checkWillSync()
        handleCallbacks.update { it.addOnResync(id, action) }
    }

    /**
     *  Remove all `onUpdate`, `onReady`, `onDesync` and `onResync` callbacks associated with the
     *  provided `handleName`.
     *
     * A [Handle] that is being removed from active usage should make sure to trigger this method
     * on its associated [StorageProxy].
     */
    fun removeCallbacksForName(id: CallbackIdentifier) {
        handleCallbacks.update { it.removeCallbacks(id) }
    }

    /**
     * Closes this [StorageProxy]. It will no longer receive messages from its associated [Store].
     * Attempting to perform an operation on a closed [StorageProxy] will result in an exception
     * being thrown.
     */
    fun close() {
        scheduler.scope.launch {
            _crdt = null
        }
        store.close()
        stateHolder.update { it.setState(ProxyState.CLOSED) }
    }

    /**
     * Apply a CRDT operation to the [CrdtModel] that this [StorageProxy] manages, notifies read
     * handles, and forwards the write to the [Store].
     */
    @Suppress("DeferredIsResult")
    fun applyOp(op: Op): Deferred<Boolean> {
        checkNotClosed()
        log.debug { "Applying operation: $op" }

        if (!crdt.applyOperation(op)) {
            return CompletableDeferred(false)
        }
        val value = crdt.consumerView

        // Let the store know about the op by piping it into our outgoing messages channel.
        val result = CompletableDeferred<Boolean>()
        sendMessageToStore(ProxyMessage.Operations(listOf(op), null), result)

        notifyUpdate(value)
        return result
    }

    /**
     * Return a copy of the current version map.
     */
    fun getVersionMap(): VersionMap = crdt.versionMap.copy()

    /**
     * Return the current local version of the model. Suspends until it has a synchronized view of
     * the data.
     */
    suspend fun getParticleView(): T = getParticleViewAsync().await()

    /**
     * Similar to [getParticleView], but requires the current proxy state to be `SYNC`, and also
     * requires the caller to be running within the [Scheduler]'s thread.
     *
     * TODO(b/153560976): Enforce the scheduler thread requirement.
     */
    fun getParticleViewUnsafe(): T {
        checkNotClosed()
        log.debug { "Getting particle view (lifecycle)" }

        // TODO: handle desync state?
        check(stateHolder.value.state == ProxyState.SYNC) {
            "Cannot get particle view directly while the storage proxy is unsynced; " +
            "current state is ${stateHolder.value.state}"
        }

        return crdt.consumerView
    }

    fun getParticleViewAsync(): Deferred<T> {
        checkNotClosed()
        check(stateHolder.value.state != ProxyState.NO_SYNC) {
            "getParticleView not valid on non-readable StorageProxy"
        }

        log.debug { "Getting particle view" }
        val future = CompletableDeferred<T>()

        val priorState = stateHolder.getAndUpdate {
            when (it.state) {
                // Already synced, exit early to avoid adding a waiting sync.
                ProxyState.SYNC -> return@getAndUpdate it
                // Time to sync.
                ProxyState.READY_TO_SYNC -> it.setState(ProxyState.AWAITING_SYNC)
                // Either already awaiting first sync, or a re-sync at this point.
                else -> it
            }.addWaitingSync(future)
        }.state

        // If this was our first state transition - it means we need to request sync.
        if (priorState == ProxyState.READY_TO_SYNC) requestSynchronization()

        // If this was called while already synced, resolve the future with the current value.
        if (priorState == ProxyState.SYNC) {
            scheduler.scope.launch {
                val result = crdt.consumerView
                log.debug { "Already synchronized, returning $result" }
                future.complete(result)
            }
        }

        return future
    }

    /**
     * Applies messages from a [Store].
     */
    suspend fun onMessage(message: ProxyMessage<Data, Op, T>) = coroutineScope {
        log.debug { "onMessage: $message" }
        if (stateHolder.value.state == ProxyState.CLOSED) {
            // TODO(wkorman): Do we really want info level in production, without message, just
            // to get visibility if/when this happens? Do we have a sense of how frequently it
            // could occur?
            log.debug { "in closed state, received message: $message" }
            return@coroutineScope
        }

        if (message is ProxyMessage.SyncRequest) {
            // Storage wants our latest state.
            val data = withContext(this@StorageProxy.dispatcher) { crdt.data }
            sendMessageToStore(ProxyMessage.ModelUpdate(data, null))
            return@coroutineScope
        }

        log.debug { "onMessage: $message, scheduling handle" }
        scheduler.schedule(
            MessageFromStoreTask {
                when (message) {
                    is ProxyMessage.ModelUpdate -> processModelUpdate(message.model)
                    is ProxyMessage.Operations -> processModelOps(message.operations)
                    else -> Unit
                }
            }
        )
    }

    private fun sendMessageToStore(
        message: ProxyMessage<Data, Op, T>,
        deferred: CompletableDeferred<Boolean> = CompletableDeferred()
    ) {
        val queueNum = outgoingMessagesInFlight.getAndIncrement()
        log.debug { "Queueing message (pos: $queueNum) for sending to the store: $message" }
        if (queueNum == 0) {
            busySendingMessagesChannel.offer(true)
        }
        outgoingMessagesChannel.offer(message to deferred)
    }

    private fun processModelUpdate(model: Data) {
        // TODO: send the returned merge changes to notifyUpdate()
        val valueBefore = crdt.consumerView
        crdt.merge(model)

        val value = crdt.consumerView
        val toResolve = mutableSetOf<CompletableDeferred<T>>()
        val priorState = stateHolder.getAndUpdate {
            toResolve.addAll(it.waitingSyncs)

            it.clearWaitingSyncs()
                .setState(ProxyState.SYNC)
        }.state

        log.debug { "Completing ${toResolve.size} waiting syncs" }
        toResolve.forEach { it.complete(value) }

        when (priorState) {
            ProxyState.AWAITING_SYNC -> notifyReady()
            ProxyState.SYNC -> if (valueBefore != value) notifyUpdate(value)
            ProxyState.DESYNC -> notifyResync()
            ProxyState.NO_SYNC,
            ProxyState.READY_TO_SYNC,
            ProxyState.CLOSED -> throw IllegalStateException(
                "received ModelUpdate on StorageProxy in state $priorState"
            )
        }
    }

    private fun processModelOps(operations: List<Op>) {
        // Ignore update ops when not synchronized.
        if (stateHolder.value.state != ProxyState.SYNC) return

        val couldApplyAllOps = operations.all { crdt.applyOperation(it) }

        if (!couldApplyAllOps) {
            stateHolder.update { it.setState(ProxyState.DESYNC) }

            log.warning { "Could not apply ops, notifying onDesync listeners and requesting Sync." }
            notifyDesync()
            requestSynchronization()
        } else {
            val futuresToResolve = mutableSetOf<CompletableDeferred<T>>()
            stateHolder.update {
                futuresToResolve.addAll(it.waitingSyncs)
                it.clearWaitingSyncs()
            }

            val newConsumerView = crdt.consumerView
            futuresToResolve.forEach { it.complete(newConsumerView) }

            log.debug { "Notifying onUpdate listeners" }

            notifyUpdate(newConsumerView)
        }
    }

    private fun requestSynchronization() {
        sendMessageToStore(ProxyMessage.SyncRequest(null))
    }

    private fun notifyReady() {
        log.debug { "notifying ready" }
        val tasks = handleCallbacks.value.let {
            buildCallbackTasks(handleCallbacks.value.onReady, "onReady") { it() } +
                buildCallbackTasks(handleCallbacks.value.notify, "notify") {
                    it(StorageEvent.READY)
                }
        }
        if (tasks.isNotEmpty()) scheduler.schedule(tasks)
    }

    private fun notifyUpdate(data: T) {
        log.debug { "notifying update" }
        val tasks = handleCallbacks.value.let {
            buildCallbackTasks(handleCallbacks.value.onUpdate, "onUpdate") { it(data) } +
                buildCallbackTasks(handleCallbacks.value.notify, "notify(UPDATE)") {
                    it(StorageEvent.UPDATE)
                }
        }
        if (tasks.isNotEmpty()) scheduler.schedule(tasks)
    }

    private fun notifyDesync() {
        log.debug { "notifying desync" }
        val tasks = handleCallbacks.value.let {
            buildCallbackTasks(handleCallbacks.value.onDesync, "onDesync") { it() } +
                buildCallbackTasks(handleCallbacks.value.notify, "notify(DESYNC)") {
                    it(StorageEvent.DESYNC)
                }
        }
        if (tasks.isNotEmpty()) scheduler.schedule(tasks)
    }

    private fun notifyResync() {
        log.debug { "notifying resync" }
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

    private fun checkNotClosed() = check(stateHolder.value.state != ProxyState.CLOSED) {
        "Unexpected operation on closed StorageProxy"
    }

    private fun checkWillSync() = check(stateHolder.value.state != ProxyState.NO_SYNC) {
        "Action handlers are not valid on a StorageProxy that has not been set up to sync " +
        "(i.e. there are no readable handles observing this proxy)"
    }

    /**
     * Two-dimensional identifier for handle callbacks. Typically this will be the handle's name,
     * as well as its particle's ID.
     */
    data class CallbackIdentifier(val handleName: String, val namespace: String = "")

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
        val onUpdate: Map<CallbackIdentifier, List<(T) -> Unit>> = emptyMap(),
        val onDesync: Map<CallbackIdentifier, List<() -> Unit>> = emptyMap(),
        val onResync: Map<CallbackIdentifier, List<() -> Unit>> = emptyMap(),
        val notify: Map<CallbackIdentifier, List<(StorageEvent) -> Unit>> = emptyMap()
    ) {
        fun addOnReady(id: CallbackIdentifier, block: () -> Unit) =
            copy(onReady = onReady + (id to ((onReady[id] ?: emptyList()) + block)))

        fun addOnUpdate(id: CallbackIdentifier, block: (T) -> Unit) =
            copy(onUpdate = onUpdate + (id to ((onUpdate[id] ?: emptyList()) + block)))

        fun addOnDesync(id: CallbackIdentifier, block: () -> Unit) =
            copy(onDesync = onDesync + (id to ((onDesync[id] ?: emptyList()) + block)))

        fun addOnResync(id: CallbackIdentifier, block: () -> Unit) =
            copy(onResync = onResync + (id to ((onResync[id] ?: emptyList()) + block)))

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
    }

    private data class StateHolder<T>(
        val state: ProxyState,
        val waitingSyncs: List<CompletableDeferred<T>> = emptyList()
    ) {
        fun setState(newState: ProxyState) = copy(state = newState)

        fun addWaitingSync(deferred: CompletableDeferred<T>) =
            copy(waitingSyncs = waitingSyncs + deferred)

        fun clearWaitingSyncs() = copy(waitingSyncs = emptyList())
    }

    /**
     * Event types used for notifying the [ParticleContext] to drive the [Particle]'s
     * storage events API.
     */
    enum class StorageEvent {
        READY,
        UPDATE,
        DESYNC,
        RESYNC
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
         * The [StorageProxy] is synchronized with its associated storage.
         */
        SYNC,

        /**
         * A set of model operations from storage failed to apply cleanly to the local CRDT model,
         * so the [StorageProxy] is desynchronized. A request has been sent to resynchronize.
         */
        DESYNC,

        /**
         * The [StorageProxy] has been closed; no further operations are possible, and no
         * messages from the store will be received.
         */
        CLOSED,
    }
}
