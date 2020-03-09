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

package arcs.core.storage.util

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Thread-safe base manager for [ProxyCallback]s.
 *
 * Implementations can define how they wish their callback tokens to be generated.
 */
abstract class AbstractProxyCallbackManager<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    private val mutex = Mutex()
    /* internal */ val callbacks = mutableMapOf<Int, ProxyCallback<Data, Op, ConsumerData>>()

    /**
     * Generates a token [Int] to be assigned to an incoming [ProxyCallback].
     */
    abstract fun getNextToken(currentlyUsedTokens: Set<Int>): Int

    /** Adds a [ProxyCallback] to the collection, and returns its token. */
    fun register(proxyCallback: ProxyCallback<Data, Op, ConsumerData>): Int {
        while (!mutex.tryLock()) { /* Wait. */ }
        val token = getNextToken(callbacks.keys)
        callbacks[token] = proxyCallback
        mutex.unlock()
        return token
    }

    /** Removes the callback with the given [callbackToken] from the collection. */
    fun unregister(callbackToken: Int) {
        while (!mutex.tryLock()) { /* Wait. */ }
        callbacks.remove(callbackToken)
        mutex.unlock()
    }

    /** Gets a particular [ProxyCallback] by its [callbackToken]. */
    fun getCallback(callbackToken: Int?): ProxyCallback<Data, Op, ConsumerData>? {
        while (!mutex.tryLock()) { /* Wait. */ }
        val res = callbacks[callbackToken]
        mutex.unlock()
        return res
    }

    /**
     * Notifies all registered [ProxyCallbackManager] of a [message].
     *
     * Optionally: you may specify [exceptTo] to omit sending to a particular callback. (with token
     * value == [exceptTo])
     */
    suspend fun send(
        message: ProxyMessage<Data, Op, ConsumerData>,
        exceptTo: Int? = null
    ): Boolean {
        val targets = mutex.withLock {
            if (exceptTo == null) {
                callbacks.values.toList()
            } else {
                callbacks.filter { it.key != exceptTo }.values.toList()
            }
        }
        // Call our targets outside of the mutex so we don't deadlock if a callback leads to another
        // registration.
        return targets.fold(true) { success, callback ->
            success && callback(message)
        }
    }

    /**
     * Notifies all multiplexed [ProxyCallback]s registered of a [message] for a particular [muxId].
     *
     * Optionally: you may specify [exceptTo] to omit sending to a particular callback. (with token
     * value == [exceptTo])
     */
    suspend fun sendMultiplexed(
        message: ProxyMessage<Data, Op, ConsumerData>,
        muxId: String,
        exceptTo: Int? = null
    ): Boolean {
        val targets = mutex.withLock {
            if (exceptTo == null) {
                ArrayList(callbacks.values)
            } else {
                ArrayList(callbacks.filter { it.key != exceptTo }.values)
            }
        }
        // Call our targets outside of the mutex so we don't deadlock if a callback leads to another
        // registration.
        return targets.fold(true) { success, callback ->
            success && callback(message, muxId)
        }
    }
}
