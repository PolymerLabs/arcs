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

/**
 * [StorageProxy] is an intermediary between a [Handle] and [Store]. It provides up-to-date CRDT
 * state to readers, and ensures write operations apply cleanly before forwarding to the store.
 *
 * @param T the consumer data type for the model behind this proxy
 * @property initialCrdt the CrdtModel instance [StorageProxy] will apply ops to.
 */
class StorageProxy<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    storeEndpointProvider: StorageCommunicationEndpointProvider<Data, Op, T>,
    initialCrdt: CrdtModel<Data, Op, T>
) {
    private val log = TaggedLog { "StorageProxy" }

    private val callbackMutex = Mutex()
    private val onUpdateActions by guardedBy(
        callbackMutex,
        mutableMapOf<String, MutableList<(T)->Unit>>()
    )
    private val onSyncActions by guardedBy(
        callbackMutex,
        mutableMapOf<String, MutableList<() -> Unit>>()
    )
    private val onDesyncActions by guardedBy(
        callbackMutex,
        mutableMapOf<String, MutableList<() -> Unit>>()
    )

    private val syncMutex = Mutex()
    private val crdt: CrdtModel<Data, Op, T>
        by guardedBy(syncMutex, initialCrdt)
    private val waitingSyncs: MutableList<CompletableDeferred<T>>
        by guardedBy(syncMutex, mutableListOf())
    private var isSynchronized: Boolean
        by guardedBy(syncMutex, false)

    private val store = storeEndpointProvider.getStorageEndpoint()
    private val storeListenerId = store.setCallback(ProxyCallback(::onMessage))

    val storageKey = storeEndpointProvider.storageKey

    /** Add a [Handle] `onUpdate` action, associated with a [Handle] name. */
    suspend fun addOnUpdate(handleName: String, action: (value: T) -> Unit) {
        callbackMutex.withLock {
            onUpdateActions.getOrPut(handleName) { mutableListOf() }.add(action)
        }
    }

    /**
     * Add a [Handle] `onSync` action, associated with a [Handle] name.
     *
     * If the [StorageProxy] is synchronized when the action is added, it will be called
     * immediately.
     *
     * If not, the [StorageProxy] will request synchronization.
     */
    suspend fun addOnSync(handleName: String, action: () -> Unit) {
        val isAlreadySynchronized = syncMutex.withLock {
            callbackMutex.withLock {
                onSyncActions.getOrPut(handleName) { mutableListOf() }.add(action)
            }
            isSynchronized
        }
        if (isAlreadySynchronized) {
            CoroutineScope(coroutineContext).launch { action() }
        } else {
            requestSynchronization()
        }
    }

    /**
     * Add a [Handle] `onDesync` action, associated with a [Handle] name.
     *
     * If the handle is not synchronized when the action is added, it will be called immediately.
     */
    suspend fun addOnDesync(handleName: String, action: () -> Unit) {
        val runNow = syncMutex.withLock {
            callbackMutex.withLock {
                onDesyncActions.getOrPut(handleName) { mutableListOf() }.add(action)
            }
            !isSynchronized
        }
        if (runNow) {
            CoroutineScope(coroutineContext).launch { action() }
        }
    }

    /**
     *  Remove all `onUpdate`, `onSync`, and `onDesync` callbacks associated with the provided
     * `handleName`.
     *
     * A [Handle] that is being removed from active usage should make sure to trigger this method
     * on its associated [StorageProxy].
     */
    suspend fun removeCallbacksForName(handleName: String) {
        callbackMutex.withLock {
            onUpdateActions.remove(handleName)
            onSyncActions.remove(handleName)
            onDesyncActions.remove(handleName)
        }
    }

    /**
     * Apply a CRDT operation to the [CrdtModel] that this [StorageProxy] manages, notifies read
     * handles, and forwards the write to the [Store].
     */
    suspend fun applyOp(op: Op): Boolean {
        log.debug { "Applying operation: $op" }
        val (localSuccess, value) = syncMutex.withLock {
            crdt.applyOperation(op) to crdt.consumerView
        }
        if (!localSuccess) return false

        val msg = ProxyMessage.Operations<Data, Op, T>(listOf(op), null)
        val storeSuccess = store.onProxyMessage(msg)

        if (!storeSuccess) {
            // we're not up to date so request latest model from store. This will get merged with
            // already applied local changes.
            requestSynchronization()
        }

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
            if (isSynchronized) {
                val result = crdt.consumerView
                log.debug { "Already synchronized, returning $result" }
                future.complete(result)
                false
            } else {
                log.debug { "Awaiting sync." }
                waitingSyncs.add(future)
                true
            }
        }

        if (needsSync) requestSynchronization()
        return future
    }

    /**
     * Applies messages from a [Store].
     */
    suspend fun onMessage(message: ProxyMessage<Data, Op, T>): Boolean {
        log.debug { "onMessage: $message" }
        when (message) {
            is ProxyMessage.ModelUpdate -> {
                val (futuresToResolve, value) = syncMutex.withLock {
                    crdt.merge(message.model)
                    isSynchronized = true
                    val toResolve = waitingSyncs.toList() // list guaranteed to be copy
                    waitingSyncs.clear()
                    toResolve to crdt.consumerView
                }

                futuresToResolve.forEach { it.complete(value) }

                notifySync()
            }
            is ProxyMessage.Operations -> {
                var futuresToResolve: List<CompletableDeferred<T>> = emptyList()
                val (value, applyFailures) = syncMutex.withLock {
                    val failures = message.operations.any { !crdt.applyOperation(it) }
                    isSynchronized = !failures
                    if (!failures) {
                        futuresToResolve = waitingSyncs.toList()
                        waitingSyncs.clear()
                    }
                    crdt.consumerView to failures
                }

                if (applyFailures) {
                    notifyDesync()
                    // Before we return, let's issue a request for synchronization on a new
                    // coroutine. It can't be done on this current coroutine because the response
                    // we give here is being waited-on downstream, and we could end up dead-locking
                    // if requestSynchronization ends up needing a result from this to continue
                    // (which is what happens with the StorageService).
                    CoroutineScope(coroutineContext).launch { requestSynchronization() }
                    return false
                }

                // all ops from storage applied cleanly so resolve waiting syncs
                futuresToResolve.forEach { it.complete(value) }

                // Notify our handles of an update if these operations came from elsewhere.
                if (message.id != storeListenerId) {
                    notifyUpdate(value)
                }
            }
            is ProxyMessage.SyncRequest -> {
                // storage wants our latest state
                val modelUpdate = syncMutex.withLock {
                    ProxyMessage.ModelUpdate<Data, Op, T>(crdt.data, null)
                }
                store.onProxyMessage(modelUpdate)
            }
        }
        return true
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

    private suspend fun notifyUpdate(data: T) = applyCallbacks(::onUpdateActions) { it(data) }
    private suspend fun notifySync() = applyCallbacks(::onSyncActions) { it() }
    private suspend fun notifyDesync() = applyCallbacks(::onDesyncActions) { it() }

    private suspend fun requestSynchronization(): Boolean {
        val msg = ProxyMessage.SyncRequest<Data, Op, T>(null)
        return store.onProxyMessage(msg)
    }
}
