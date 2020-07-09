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
import kotlin.random.Random
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Thread-safe base manager for [ProxyCallback]s.
 *
 * Implementations can define how they wish their callback tokens to be generated.
 */
class ProxyCallbackManager<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    /**
     * Generates a token [Int] to be assigned to an incoming [ProxyCallback].
     */
    /* internal */
    val tokenGenerator: (currentlyUsedTokens: Set<Int>) -> Int
) {
    private val mutex = Mutex()
    /* internal */ val callbacks = mutableMapOf<Int, ProxyCallback<Data, Op, ConsumerData>>()

    /** Adds a [ProxyCallback] to the collection, and returns its token. */
    fun register(proxyCallback: ProxyCallback<Data, Op, ConsumerData>, callbackToken: Int? = null): Int {
        while (!mutex.tryLock()) { /* Wait. */ }
        val token = callbackToken ?: tokenGenerator(callbacks.keys)
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

    /** True if no callbacks are registered. */
    fun isEmpty(): Boolean {
        while (!mutex.tryLock()) { /* Wait. */ }
        val isEmpty = callbacks.isEmpty()
        mutex.unlock()
        return isEmpty
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
    ) {
        val targets = mutex.withLock {
            if (exceptTo == null) {
                callbacks.values.toList()
            } else {
                callbacks.filter { it.key != exceptTo }.values.toList()
            }
        }
        // Call our targets outside of the mutex so we don't deadlock if a callback leads to another
        // registration.
        targets.forEach { it(message) }
    }
}

/**
 * Creates a [ProxyCallbackManager] where each callback is given a token from an increasing source.
 */
/* ktlint-disable max-line-length */
fun <Data : CrdtData, Op : CrdtOperation, ConsumerData> ProxyCallbackManager(): ProxyCallbackManager<Data, Op, ConsumerData> {
    val nextCallbackToken = atomic(0)
    return ProxyCallbackManager { nextCallbackToken.incrementAndGet() }
}
/* ktlint-enable max-line-length */

/**
 * Creates a [ProxyCallbackManager] which is preferable to the regular [ProxyCallbackManager]
 * in situations where more than one host is connecting to the store at a time.
 *
 * @param baseData a salt of sorts, used to help in making callback IDs more unique across hosts.
 * @param random source of randomness to use when generating callback IDs.
 */
fun <Data : CrdtData, Op : CrdtOperation, ConsumerData> RandomProxyCallbackManager(
    baseData: String,
    random: Random
): ProxyCallbackManager<Data, Op, ConsumerData> = ProxyCallbackManager { currentlyUsedTokens ->
    var unique = random.nextInt()
    var tokenString = "$unique::$baseData"

    while (tokenString.hashCode() in currentlyUsedTokens) {
        unique = random.nextInt()
        tokenString = "$unique::$baseData"
    }

    tokenString.hashCode()
}
