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
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.internal.VersionMap
import kotlinx.atomicfu.locks.reentrantLock
import kotlinx.atomicfu.locks.withLock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

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
    private val mutex = reentrantLock()
    private val handles: MutableSet<Handle<Data, Op, T>> = mutableSetOf()
    private val crdt = initialCrdt
    private val waitingSyncs: MutableList<CompletableDeferred<ValueAndVersion<T>>> = mutableListOf()
    private var synchronized = false
    private var listenerAttached = false
    private var hasReaders = false

    private val store = storeEndpointProvider.getStorageEndpoint()

    /**
     * Connects a handle. If the handle is readable, it will receive the configured callbacks.
     */
    suspend fun registerHandle(handle: Handle<Data, Op, T>): VersionMap {
        // non-readers don't get callbacks, return early
        if (!handle.canRead) {
            mutex.withLock {
                return crdt.versionMap.copy()
            }
        }

        mutex.withLock() {
            if (!listenerAttached) {
                store.setCallback(ProxyCallback<Data, Op, T>(::onMessage))
                listenerAttached = true
            }

            handles.add(handle)

            // Change to synchronized mode as soon as we get any read handles and send a request to get
            // the full model (once).
            if (!this.hasReaders) {
                this.requestSynchronization()
                this.hasReaders = true
            }

            // If a handle registers after we've received the full model, notify it immediately.
            if (this.synchronized) {
                coroutineScope {
                    launch { handle.callback?.onSync() }
                }
            }
            return crdt.versionMap.copy()
        }
    }

    /**
     * Disconnects a handle so it no longer receives callbacks.
     */
    suspend fun deregisterHandle(handle: Handle<Data, Op, T>) {
        mutex.withLock {
            handles.remove(handle)
        }
    }

    /**
     * Apply a CRDT operation to the [CrdtModel] that this [StorageProxy] manages, notifies read
     * handles, and forwards the write to the [Store].
     */
    suspend fun applyOp(op: Op): Boolean {
        mutex.withLock {
            if (!crdt.applyOperation(op)) {
                return false
            }
            val msg = ProxyMessage.Operations<Data, Op, T>(listOf(op), null)
            store.onProxyMessage(msg)
            notifyUpdate(op)
            return true
        }
    }

    /**
     * Return the current local version of the model, as well as the current associated version map
     * for the data. Suspends until it has a synchronized view of the data.
     */
    suspend fun getParticleView(): ValueAndVersion<T> {
        return getParticleViewAsync().await()
    }

    suspend fun getParticleViewAsync(): CompletableDeferred<ValueAndVersion<T>> {
        val future = CompletableDeferred<ValueAndVersion<T>>()
        mutex.withLock {
            if (synchronized) {
                future.complete(ValueAndVersion(crdt.consumerView, crdt.versionMap))
            } else {
                waitingSyncs.add(future)
            }
        }
        return future
    }

    /**
     * Applies messages from a [Store].
     */
    suspend fun onMessage(message: ProxyMessage<Data, Op, T>): Boolean {
        mutex.withLock {
            when (message) {
                is ProxyMessage.ModelUpdate -> {
                    this.crdt.merge(message.model)
                    this.setSynchronized()
                }
                is ProxyMessage.Operations -> {
                    // If we have no readers, we can ignore updates from storage
                    if (!this.hasReaders) {
                        return false
                    }
                    for (op in message.operations) {
                        if (!this.crdt.applyOperation(op)) {
                            // If we cannot cleanly apply ops, sync the whole model.
                            this.clearSynchronized()
                            return this.requestSynchronization()
                        }
                        if (!this.synchronized) {
                            // If we didn't think we were synchronized but the operation applied
                            // cleanly, then actually we were synchronized after all. Tell the
                            // handle that.
                            this.setSynchronized()
                        }
                        this.notifyUpdate(op)
                    }
                }
                is ProxyMessage.SyncRequest -> {
                    // storage wants our latest state
                    val modelUpdate = ProxyMessage.ModelUpdate<Data, Op, T>(this.crdt.data, null)
                    this.store.onProxyMessage(modelUpdate)
                }
                else -> throw CrdtException("Invalid operation, msg: $message")
            }
            return true
        }
    }

    // must be called under single-thread-confinement
    private suspend fun setSynchronized() {
        if (!this.synchronized) {
            this.synchronized = true
            this.notifySync()
        }
        for (sync in waitingSyncs) {
            sync.complete(getParticleView())
        }
        waitingSyncs.clear()
    }

    // must be called under single-thread-confinement
    private suspend fun clearSynchronized() {
        if (this.synchronized) {
            this.synchronized = false
            this.notifyDesync()
        }
    }

    // must be called under single-thread-confinement
    private suspend fun notifyUpdate(op: Op) {
        coroutineScope {
            for (handle in handles) {
                launch {
                    handle.callback?.onUpdate(op)
                }
            }
        }
    }

    // must be called under single-thread-confinement
    private suspend fun notifySync() {
        coroutineScope {
            for (handle in handles) {
                launch {
                    handle.callback?.onSync()
                }
            }
        }
    }

    // must be called under single-thread-confinement
    private suspend fun notifyDesync() {
        coroutineScope {
            for (handle in handles) {
                launch {
                    handle.callback?.onDesync()
                }
            }
        }
    }

    // must be called under single-thread-confinement
    private suspend fun requestSynchronization(): Boolean {
        val msg = ProxyMessage.SyncRequest<Data, Op, T>(null)
        return this.store.onProxyMessage(msg)
    }
}
