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
import arcs.core.util.TaggedLog
import arcs.core.util.guardedBy
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

// Visible for testing
enum class ProxyState { INIT, AWAITING_SYNC, SYNC, DESYNC }

/**
 * [StorageProxy] is an intermediary between a [Handle] and [Store]. It provides up-to-date CRDT
 * state to readers, and ensures write operations apply cleanly before forwarding to the store.
 *
 * @param T the consumer data type for the model behind this proxy
 * @param initialCrdt the CrdtModel instance [StorageProxy] will apply ops to.
 */
class StorageProxy<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    storeEndpointProvider: StorageCommunicationEndpointProvider<Data, Op, T>,
    initialCrdt: CrdtModel<Data, Op, T>
) {
    private val log = TaggedLog { "StorageProxy" }

    private val callbackMutex = Mutex()
    private val onReadyActions by guardedBy(
        callbackMutex,
        mutableMapOf<String, MutableList<() -> Unit>>()
    )
    private val onUpdateActions by guardedBy(
        callbackMutex,
        mutableMapOf<String, MutableList<suspend (T) -> Unit>>()
    )
    private val onDesyncActions by guardedBy(
        callbackMutex,
        mutableMapOf<String, MutableList<() -> Unit>>()
    )
    private val onResyncActions by guardedBy(
        callbackMutex,
        mutableMapOf<String, MutableList<() -> Unit>>()
    )

    private val syncMutex = Mutex()
    private val crdt: CrdtModel<Data, Op, T>
        by guardedBy(syncMutex, initialCrdt)
    private val waitingSyncs: MutableList<CompletableDeferred<T>>
        by guardedBy(syncMutex, mutableListOf())
    private var state: ProxyState
        by guardedBy(syncMutex, ProxyState.INIT)

    private val store = storeEndpointProvider.getStorageEndpoint(ProxyCallback(::onMessage))

    val storageKey = storeEndpointProvider.storageKey

    suspend fun getStateForTesting(): ProxyState = syncMutex.withLock { state }

    /**
     * Add a [Handle] `onReady` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is synchronized when the action is added, it will be called
     * immediately.
     *
     * If the [StorageProxy] is in its initial state, the first call to any of the action methods
     * will trigger a request for synchronization.
     */
    suspend fun addOnReady(handleName: String, action: () -> Unit) {
        val currentState = addAction {
            onReadyActions.getOrPut(handleName) { mutableListOf() }.add(action)
        }
        if (currentState == ProxyState.SYNC) {
            CoroutineScope(coroutineContext).launch { action() }
        }
    }

    /**
     * Add a [Handle] `onUpdate` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is in its initial state, the first call to any of the action methods
     * will trigger a request for synchronization.
     */
    suspend fun addOnUpdate(handleName: String, action: suspend (value: T) -> Unit) {
        addAction {
            onUpdateActions.getOrPut(handleName) { mutableListOf() }.add(action)
        }
    }

    /**
     * Add a [Handle] `onDesync` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is desynchronized when the action is added, it will be called
     * immediately.
     *
     * If the [StorageProxy] is in its initial state, the first call to any of the action methods
     * will trigger a request for synchronization.
     */
    suspend fun addOnDesync(handleName: String, action: () -> Unit) {
        val currentState = addAction {
            onDesyncActions.getOrPut(handleName) { mutableListOf() }.add(action)
        }
        if (currentState == ProxyState.DESYNC) {
            CoroutineScope(coroutineContext).launch { action() }
        }
    }

    /**
     * Add a [Handle] `onResync` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is in its initial state, the first call to any of the action methods
     * will trigger a request for synchronization.
     */
    suspend fun addOnResync(handleName: String, action: () -> Unit) {
        addAction {
            onResyncActions.getOrPut(handleName) { mutableListOf() }.add(action)
        }
    }

    /**
     * Run the `add` function to add a storage event action method.
     *
     * If the [StorageProxy] is in the INIT state, send a sync request and move to AWAITING_SYNC.
     */
    private suspend fun addAction(add: () -> Unit): ProxyState {
        var needsSync = false
        val currentState = syncMutex.withLock {
            if (state == ProxyState.INIT) {
                needsSync = true
                state = ProxyState.AWAITING_SYNC
            }
            callbackMutex.withLock {
                add()
            }
            state
        }
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
    suspend fun removeCallbacksForName(handleName: String) {
        callbackMutex.withLock {
            onReadyActions.remove(handleName)
            onUpdateActions.remove(handleName)
            onDesyncActions.remove(handleName)
            onResyncActions.remove(handleName)
        }
    }

    /**
     * Apply a CRDT operation to the [CrdtModel] that this [StorageProxy] manages, notifies read
     * handles, and forwards the write to the [Store].
     */
    suspend fun applyOp(op: Op): Boolean {
        log.debug { "Applying operation: $op" }
        val value = syncMutex.withLock {
            if (!crdt.applyOperation(op)) return false
            crdt.consumerView
        }

        store.onProxyMessage(ProxyMessage.Operations(listOf(op), null))
        notifyUpdate(value)

        return true
    }

    /**
     * Return the current local version of the model. Suspends until it has a synchronized view of
     * the data.
     */
    suspend fun getParticleView(): T = getParticleViewAsync().await()

    /**
     * Return a copy of the current version map.
     */
    suspend fun getVersionMap(): VersionMap = syncMutex.withLock { crdt.versionMap.copy() }

    suspend fun getParticleViewAsync(): Deferred<T> {
        log.debug { "Getting particle view" }
        val future = CompletableDeferred<T>()

        val needsSync = syncMutex.withLock {
            if (state == ProxyState.SYNC) {
                val result = crdt.consumerView
                log.debug { "Already synchronized, returning $result" }
                future.complete(result)
                false
            } else {
                log.debug { "Awaiting sync." }
                waitingSyncs.add(future)
                if (state == ProxyState.INIT) {
                    state = ProxyState.AWAITING_SYNC
                    true
                } else {
                    // We've already sent a sync request.
                    false
                }
            }
        }

        if (needsSync) requestSynchronization()
        return future
    }

    /**
     * Applies messages from a [Store].
     */
    suspend fun onMessage(message: ProxyMessage<Data, Op, T>) {
        log.debug { "onMessage: $message" }
        when (message) {
            is ProxyMessage.ModelUpdate -> processModelUpdate(message.model)
            is ProxyMessage.Operations -> processModelOps(message.operations)
            is ProxyMessage.SyncRequest -> {
                // Storage wants our latest state.
                val modelUpdate = syncMutex.withLock {
                    ProxyMessage.ModelUpdate<Data, Op, T>(crdt.data, null)
                }
                store.onProxyMessage(modelUpdate)
            }
        }
    }

    private suspend fun processModelUpdate(model: Data) {
        val (futuresToResolve, particleView, notifyFn) = syncMutex.withLock {
            // TODO: send the returned merge changes to notifyUpdate()
            crdt.merge(model)

            // We need to read consumerView inside the mutex; capture it to use in notifyUpdate.
            val value = crdt.consumerView
            val innerNotifyFn = when (state) {
                ProxyState.INIT, ProxyState.AWAITING_SYNC -> suspend { notifyReady() }
                ProxyState.SYNC -> suspend { notifyUpdate(value) }
                ProxyState.DESYNC -> suspend { notifyResync() }
            }
            state = ProxyState.SYNC

            val toResolve = waitingSyncs.toList() // list guaranteed to be copy
            waitingSyncs.clear()
            Triple(toResolve, crdt.consumerView, innerNotifyFn)
        }

        notifyFn()
        futuresToResolve.forEach { it.complete(particleView) }
    }

    private suspend fun processModelOps(operations: List<Op>) {
        var futuresToResolve: List<CompletableDeferred<T>> = emptyList()
        val (value, applyFailures) = syncMutex.withLock {
            // Ignore update ops when not synchronized.
            if (state != ProxyState.SYNC) return

            val failures = operations.any { !crdt.applyOperation(it) }
            if (failures) {
                state = ProxyState.DESYNC
            } else {
                futuresToResolve = waitingSyncs.toList() // list guaranteed to be copy
                waitingSyncs.clear()
            }
            Pair(crdt.consumerView, failures)
        }

        if (applyFailures) {
            notifyDesync()
            // Before we return, let's issue a request for synchronization on a new
            // coroutine. It can't be done on this current coroutine because the response
            // we give here is being waited-on downstream, and we could end up dead-locking
            // if requestSynchronization ends up needing a result from this to continue
            // (which is what happens with the StorageService).
            CoroutineScope(coroutineContext).launch { requestSynchronization() }
        } else {
            // All ops from storage applied cleanly so resolve waiting syncs.
            futuresToResolve.forEach { it.complete(value) }
            notifyUpdate(value)
        }
    }

    /** Safely make a copy of the specified action set, and launch each action on a coroutine */
    private suspend fun <FT : Function<Unit>> applyCallbacks(
        actions: () -> Map<String, List<FT>>,
        block: (FT) -> Unit
    ) = callbackMutex.withLock {
        coroutineScope {
            actions().values.flatten().forEach { action ->
                launch {
                    block(action)
                }
            }
        }
    }

    /** Safely make a copy of the specified action set, and launch each action on a coroutine. */
    private suspend fun <FT : Function<Unit>> applySuspendingCallbacks(
        actions: () -> Map<String, List<FT>>,
        block: suspend (FT) -> Unit
    ) {
        val callbacks = callbackMutex.withLock {
            actions().values.flatten()
        }
        coroutineScope {
            callbacks.forEach { action ->
                launch {
                    block(action)
                }
            }
        }
    }

    private suspend fun notifyReady() = applyCallbacks(::onReadyActions) { it() }
    private suspend fun notifyUpdate(data: T) = applySuspendingCallbacks(::onUpdateActions) {
        it(data)
    }
    private suspend fun notifyDesync() = applyCallbacks(::onDesyncActions) { it() }
    private suspend fun notifyResync() = applyCallbacks(::onResyncActions) { it() }

    private suspend fun requestSynchronization() {
        store.onProxyMessage(ProxyMessage.SyncRequest(null))
    }
}
