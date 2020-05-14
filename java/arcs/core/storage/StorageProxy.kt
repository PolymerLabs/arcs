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
import arcs.core.util.SchedulerDispatcher
import arcs.core.util.TaggedLog
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.getAndUpdate
import kotlinx.atomicfu.update
import kotlinx.atomicfu.updateAndGet
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * [StorageProxy] is an intermediary between a [Handle] and [Store]. It provides up-to-date CRDT
 * state to readers, and ensures write operations apply cleanly before forwarding to the store.
 *
 * @param T the consumer data type for the model behind this proxy
 * @param initialCrdt the CrdtModel instance [StorageProxy] will apply ops to.
 */
class StorageProxy<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    storeEndpointProvider: StorageCommunicationEndpointProvider<Data, Op, T>,
    crdt: CrdtModel<Data, Op, T>,
    private val scheduler: Scheduler
) {
    // Nullable internally, we don't allow constructor to pass null model
    private var _crdt: CrdtModel<Data, Op, T>? = crdt

    private val crdt: CrdtModel<Data, Op, T>
        get() = requireNotNull(_crdt) {
            "crdt field is null, StorageProxy closed?"
        }

    /**
     * If you need to interact with the data managed by this [StorageProxy], and you're not a
     * [Store], you must either be performing your interactions within a handle callback or on this
     * [CoroutineDispatcher].
     */
    val dispatcher: CoroutineDispatcher = SchedulerDispatcher(scheduler)

    /** Identifier of the data this [StorageProxy] is managing. */
    val storageKey: StorageKey = storeEndpointProvider.storageKey

    private val log = TaggedLog { "StorageProxy" }
    private val handleCallbacks = atomic(HandleCallbacks<T>())
    private val stateHolder = atomic(StateHolder<T>(ProxyState.INIT))
    private val store: StorageCommunicationEndpoint<Data, Op, T> =
        storeEndpointProvider.getStorageEndpoint(ProxyCallback(::onMessage))

    /* visible for testing */
    fun getStateForTesting(): ProxyState = stateHolder.value.state

    /**
     * Add a [Handle] `onReady` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is synchronized when the action is added, it will be called
     * on the next iteration of the [Scheduler].
     *
     * If the [StorageProxy] is in its initial state, the first call to any of the action methods
     * will trigger a request for synchronization.
     */
    fun addOnReady(id: CallbackIdentifier, action: () -> Unit) {
        val currentState = addAction { handleCallbacks.update { it.addOnReady(id, action) } }
        if (currentState == ProxyState.SYNC) {
            scheduler.schedule(HandleCallbackTask(id, action))
        }
    }

    /**
     * Add a [Handle] `onUpdate` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is in its initial state, the first call to any of the action methods
     * will trigger a request for synchronization.
     */
    fun addOnUpdate(id: CallbackIdentifier, action: (value: T) -> Unit) {
        addAction { handleCallbacks.update { it.addOnUpdate(id, action) } }
    }

    /**
     * Add a [Handle] `onDesync` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is desynchronized when the action is added, it will be called
     * on the next iteration of the [Scheduler].
     *
     * If the [StorageProxy] is in its initial state, the first call to any of the action methods
     * will trigger a request for synchronization.
     */
    fun addOnDesync(id: CallbackIdentifier, action: () -> Unit) {
        val currentState = addAction { handleCallbacks.update { it.addOnDesync(id, action) } }
        if (currentState == ProxyState.DESYNC) {
            scheduler.schedule(HandleCallbackTask(id, action))
        }
    }

    /**
     * Add a [Handle] `onResync` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is in its initial state, the first call to any of the action methods
     * will trigger a request for synchronization.
     */
    fun addOnResync(id: CallbackIdentifier, action: () -> Unit) {
        addAction { handleCallbacks.update { it.addOnResync(id, action) } }
    }

    /**
     * Run the `add` function to add a storage event action method.
     *
     * If the [StorageProxy] is in the INIT state, send a sync request and move to AWAITING_SYNC.
     */
    private fun addAction(add: () -> Unit): ProxyState {
        checkNotClosed()
        add()

        var needsSync = false
        val currentState = stateHolder.updateAndGet {
            if (it.state == ProxyState.INIT) {
                needsSync = true
                it.setState(ProxyState.AWAITING_SYNC)
            } else {
                needsSync = false
                it
            }
        }.state

        if (needsSync) requestSynchronization()
        return currentState
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
        scheduler.scope.launch(dispatcher) {
            _crdt = null
        }
        store.close()
        stateHolder.update { it.setState(ProxyState.CLOSED) }
    }

    /**
     * Apply a CRDT operation to the [CrdtModel] that this [StorageProxy] manages, notifies read
     * handles, and forwards the write to the [Store].
     */
    fun applyOp(op: Op): Deferred<Boolean> {
        checkNotClosed()
        log.debug { "Applying operation: $op" }

        if (!crdt.applyOperation(op)) {
            return CompletableDeferred(false)
        }
        val value = crdt.consumerView

        // Let the store know about the op.
        val result = CompletableDeferred<Boolean>()
        scheduler.scope.launch {
            log.debug { "Sending operations to store" }
            store.onProxyMessage(ProxyMessage.Operations(listOf(op), null))
            log.debug { "Operations sent to store" }
            withContext(Dispatchers.Default) { store.idle() }
            log.debug { "Store became idle" }
            result.complete(true)
        }

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

        check(stateHolder.value.state == ProxyState.SYNC) {
            "Cannot get particle view directly while the storage proxy is unsynced"
        }

        return crdt.consumerView
    }

    fun getParticleViewAsync(): Deferred<T> {
        checkNotClosed()
        log.debug { "Getting particle view" }
        val future = CompletableDeferred<T>()

        val priorState = stateHolder.getAndUpdate {
            when (it.state) {
                // Already synced, exit early to avoid adding a waiting sync.
                ProxyState.SYNC -> return@getAndUpdate it
                // Time to sync.
                ProxyState.INIT -> it.setState(ProxyState.AWAITING_SYNC)
                // Either already awaiting first sync, or a re-sync at this point.
                else -> it
            }.addWaitingSync(future)
        }

        // If this was our first state transition - it means we need to request sync.
        if (priorState.state == ProxyState.INIT) requestSynchronization()

        // If this was called while already synced, resolve the future with the current value.
        if (priorState.state == ProxyState.SYNC) {
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
            log.info { "in closed state, received message: $message" }
            return@coroutineScope
        }

        if (message is ProxyMessage.SyncRequest) {
            // Storage wants our latest state.
            launch {
                val data = withContext(this@StorageProxy.dispatcher) { crdt.data }
                store.onProxyMessage(ProxyMessage.ModelUpdate<Data, Op, T>(data, null))
            }
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

    private fun processModelUpdate(model: Data) {
        // TODO: send the returned merge changes to notifyUpdate()
        crdt.merge(model)

        val value = crdt.consumerView
        val toResolve = mutableSetOf<CompletableDeferred<T>>()
        val oldState = stateHolder.getAndUpdate {
            toResolve.addAll(it.waitingSyncs)

            it.clearWaitingSyncs()
                .setState(ProxyState.SYNC)
        }

        log.debug { "Completing ${toResolve.size} waiting syncs" }
        toResolve.forEach { it.complete(value) }

        when (oldState.state) {
            ProxyState.INIT,
            ProxyState.AWAITING_SYNC -> notifyReady()
            ProxyState.SYNC -> notifyUpdate(value)
            ProxyState.DESYNC -> notifyResync()
            ProxyState.CLOSED ->
                throw IllegalStateException("processModelUpdate on closed StorageProxy")
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
            var futuresToResolve = emptyList<CompletableDeferred<T>>()
            stateHolder.update {
                futuresToResolve = it.waitingSyncs
                it.clearWaitingSyncs()
            }

            val newConsumerView = crdt.consumerView
            futuresToResolve.forEach { it.complete(newConsumerView) }

            log.debug { "Notifying onUpdate listeners" }

            notifyUpdate(newConsumerView)
        }
    }

    private fun requestSynchronization() = scheduler.scope.launch {
        store.onProxyMessage(ProxyMessage.SyncRequest(null))
    }

    private fun notifyReady() {
        log.debug { "notifying ready" }
        scheduleCallbackTasks(handleCallbacks.value.onReady) { it() }
    }
    private fun notifyUpdate(data: T) {
        log.debug { "notifying update" }
        scheduleCallbackTasks(handleCallbacks.value.onUpdate) { it(data) }
    }
    private fun notifyDesync() = scheduleCallbackTasks(handleCallbacks.value.onDesync) { it() }
    private fun notifyResync() {
        log.debug { "notifying resync" }
        scheduleCallbackTasks(handleCallbacks.value.onResync) { it() }
    }

    /** Schedule [HandleCallbackTask]s for all given [callbacks] with the [Scheduler]. */
    private fun <FT : Function<Unit>> scheduleCallbackTasks(
        callbacks: Map<CallbackIdentifier, List<FT>>,
        block: (FT) -> Unit
    ) {
        val tasks = callbacks.entries.flatMap { (id, callbacks) ->
            callbacks.map { callback ->
                HandleCallbackTask(id) {
                    log.debug { "Executing callback for $id" }
                    block(callback)
                }
            }
        }

        scheduler.schedule(tasks)
    }

    private fun checkNotClosed() = check(stateHolder.value.state != ProxyState.CLOSED) {
        "Unexpected operation on closed StorageProxy"
    }

    /**
     * Two-dimensional identifier for handle callbacks. Typically this will be the handle's name,
     * as well as its particle's ID.
     */
    data class CallbackIdentifier(val handleName: String, val namespace: String = "")

    private class MessageFromStoreTask(block: () -> Unit) : Scheduler.Task.Processor(block)

    private class HandleCallbackTask(
        callbackIdentifier: CallbackIdentifier,
        block: () -> Unit
    ) : Scheduler.Task.Listener(
        callbackIdentifier.namespace,
        callbackIdentifier.handleName,
        block
    )

    private data class HandleCallbacks<T>(
        val onReady: Map<CallbackIdentifier, List<() -> Unit>> = emptyMap(),
        val onUpdate: Map<CallbackIdentifier, List<(T) -> Unit>> = emptyMap(),
        val onDesync: Map<CallbackIdentifier, List<() -> Unit>> = emptyMap(),
        val onResync: Map<CallbackIdentifier, List<() -> Unit>> = emptyMap()
    ) {
        fun addOnReady(id: CallbackIdentifier, block: () -> Unit) =
            copy(onReady = onReady + (id to ((onReady[id] ?: emptyList()) + block)))

        fun addOnUpdate(id: CallbackIdentifier, block: (T) -> Unit) =
            copy(onUpdate = onUpdate + (id to ((onUpdate[id] ?: emptyList()) + block)))

        fun addOnDesync(id: CallbackIdentifier, block: () -> Unit) =
            copy(onDesync = onDesync + (id to ((onDesync[id] ?: emptyList()) + block)))

        fun addOnResync(id: CallbackIdentifier, block: () -> Unit) =
            copy(onResync = onResync + (id to ((onResync[id] ?: emptyList()) + block)))

        fun removeCallbacks(id: CallbackIdentifier) =
            copy(
                onReady = onReady - id,
                onUpdate = onUpdate - id,
                onDesync = onDesync - id,
                onResync = onResync - id
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

    // Visible for testing
    enum class ProxyState {
        /**
         * The [StorageProxy] has not received any actions to invoke on storage events. A call to
         * `onReady`, `onUpdate`, `onDesync` or `onResync` will change the state to [AWAITING_SYNC].
         */
        INIT,

        /**
         * The [StorageProxy] has received at least one action for storage events. A sync request
         * has been sent to storage, but the response has not been received yet.
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
