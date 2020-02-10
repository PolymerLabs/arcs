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
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.VersionMap
import arcs.core.util.TaggedLog
import arcs.core.util.guardWith
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** [ValueAndVersion] is used to tie a value to the VersionMap it was current as-of. */
data class ValueAndVersion<T>(val value: T, val versionMap: VersionMap)

/**
 * [StorageProxy] is an intermediary between a [Handle] and [Store]. It provides up-to-date CRDT
 * state to readers, and ensures write operations apply cleanly before forwarding to the store.
 *
 * @param T the consumer data type for the model behind this proxy
 * @property initialCrdt the CrdtModel instance [StorageProxy] will apply ops to.
 */
class StorageProxy<Data : CrdtData, Op : CrdtOperation, T>(
    storeEndpointProvider: StorageCommunicationEndpointProvider<Data, Op, T>,
    initialCrdt: CrdtModel<Data, Op, T>
) {
    private val log = TaggedLog { "StorageProxy" }

    private val handlesMutex = Mutex()
    private val readHandles
        by guardWith<MutableSet<Handle<Data, Op, T>>>(handlesMutex, mutableSetOf())

    private val syncMutex = Mutex()
    private val crdt
        by guardWith(syncMutex, initialCrdt)
    private val waitingSyncs
        by guardWith(syncMutex, mutableListOf<CompletableDeferred<ValueAndVersion<T>>>())
    private var synchronized
        by guardWith(syncMutex, false)

    private val store = storeEndpointProvider.getStorageEndpoint()

    init {
        store.setCallback(ProxyCallback(::onMessage))
    }

    /**
     * Connects a [Handle]. If the handle is readable, it will receive the configured callbacks.
     */
    suspend fun registerHandle(handle: Handle<Data, Op, T>): VersionMap {
        // non-readers don't get callbacks, return early
        if (!handle.canRead) return syncMutex.withLock { crdt.versionMap.copy() }

        log.debug { "Registering handle: $handle" }

        val firstReader = handlesMutex.withLock {
            readHandles.add(handle)
            readHandles.size == 1
        }

        val (hasSynced, versionMap) = syncMutex.withLock { synchronized to crdt.versionMap.copy() }

        if (firstReader) requestSynchronization()
        else if (hasSynced) coroutineScope { launch { handle.callback?.onSync() } }

        return versionMap
    }

    /**
     * Disconnects a handle so it no longer receives callbacks.
     */
    suspend fun deregisterHandle(handle: Handle<Data, Op, T>) {
        log.debug { "Unregistering handle: $handle" }
        handlesMutex.withLock { readHandles.remove(handle) }
    }

    /**
     * Apply a CRDT operation to the [CrdtModel] that this [StorageProxy] manages, notifies read
     * handles, and forwards the write to the [Store].
     */
    suspend fun applyOp(op: Op): Boolean {
        log.debug { "Applying operation: $op" }
        val localSuccess = syncMutex.withLock { crdt.applyOperation(op) }
        if (!localSuccess) return false

        val msg = ProxyMessage.Operations<Data, Op, T>(listOf(op), null)
        val storeSuccess = store.onProxyMessage(msg)

        // TODO(jwf/jibbl): We need to think-through the ramifications of returning false if
        //  the store fails to apply the update. Maybe we should delete our local copy and ask for
        //  a re-sync in this situation?
        if (!storeSuccess) return false

        notifyUpdate(listOf(op))

        return true
    }

    /**
     * Return the current local version of the model, as well as the current associated version map
     * for the data. Suspends until it has a synchronized view of the data.
     */
    suspend fun getParticleView(): ValueAndVersion<T> = getParticleViewAsync().await()

    suspend fun getParticleViewAsync(): CompletableDeferred<ValueAndVersion<T>> {
        log.debug { "Getting particle view" }
        val future = CompletableDeferred<ValueAndVersion<T>>()

        val needsSync = syncMutex.withLock {
            if (synchronized) {
                val result = ValueAndVersion(crdt.consumerView, crdt.versionMap.copy())
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
                val (futuresToResolve, valueAndVersion) = syncMutex.withLock {
                    crdt.merge(message.model)
                    synchronized = true
                    ArrayList(waitingSyncs).also { waitingSyncs.clear() } to
                        ValueAndVersion(crdt.consumerView, crdt.versionMap.copy())
                }

                futuresToResolve.forEach { it.complete(valueAndVersion) }

                notifySync()
            }
            is ProxyMessage.Operations -> {
                val shouldNotifyDesync = syncMutex.withLock {
                    val failures = message.operations.any { !crdt.applyOperation(it) }
                    synchronized = !failures
                    failures
                }

                if (shouldNotifyDesync) {
                    notifyDesync()
                    requestSynchronization()
                    return true
                }

                notifyUpdate(message.operations)
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

    private suspend fun notifyUpdate(ops: List<Op>) = forEachHandle { handle ->
        ops.forEach { handle.callback?.onUpdate(it) }
    }

    private suspend fun notifySync() = forEachHandle { it.callback?.onSync() }

    private suspend fun notifyDesync() = forEachHandle { it.callback?.onDesync() }

    private suspend inline fun forEachHandle(crossinline block: (Handle<Data, Op, T>) -> Unit) {
        val handlesToNotify = handlesMutex.withLock {
            mutableSetOf<Handle<Data, Op, T>>().apply { addAll(readHandles) }
        }
        coroutineScope {
            handlesToNotify.forEach { handle ->
                launch { block(handle) }
            }
        }
    }

    private suspend fun requestSynchronization(): Boolean {
        val msg = ProxyMessage.SyncRequest<Data, Op, T>(null)
        return store.onProxyMessage(msg)
    }
}
