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

import kotlin.random.Random
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

typealias Callback<T> = suspend (T) -> Unit
/**
 * Thread-safe base manager for [Callback]s.
 *
 * Implementations can define how they wish their callback tokens to be generated.
 */
class CallbackManager<T>(
    /**
     * Generates a token [Int] to be assigned to an incoming [Callback].
     */
    /* internal */
    val tokenGenerator: (currentlyUsedTokens: Set<Int>) -> Int
) {
    private val mutex = Mutex()
    /* internal */ val callbacks = mutableMapOf<Int, Callback<T>>()

    private var hasEverSetCallback = false

    /** Adds a [ProxyCallback] to the collection, and returns its token. */
    fun register(callback: Callback<T>): Int {
        while (!mutex.tryLock()) { /* Wait. */ }
        val token = tokenGenerator(callbacks.keys)
        callbacks[token] = callback
        hasEverSetCallback = true
        mutex.unlock()
        return token
    }

    /**
     * Removes the callback with the given [callbackToken] from the collection.
     */
    fun unregister(callbackToken: Int) {
        while (!mutex.tryLock()) { /* Wait. */ }
        callbacks.remove(callbackToken)
        mutex.unlock()
    }

    /** Gets a particular [Callback] by its [callbackToken]. */
    fun getCallback(callbackToken: Int?): (suspend (T) -> Unit)? {
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

    /** True if no callbacks are registered, and at least one has been registered before. */
    fun hasBecomeEmpty(): Boolean {
        while (!mutex.tryLock()) { /* Wait. */ }
        val isEmpty = hasEverSetCallback && callbacks.isEmpty()
        mutex.unlock()
        return isEmpty
    }

    /**
     * Notifies all registered [CallbackManager] of a [message].
     *
     * Optionally: you may specify [exceptTo] to omit sending to a particular callback. (with token
     * value == [exceptTo])
     */
    suspend fun send(
        message: T,
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
 * Creates a [CallbackManager] where each callback is given a token from an increasing source.
 */
fun <T> callbackManager(): CallbackManager<T> {
    val nextCallbackToken = atomic(0)
    return CallbackManager { nextCallbackToken.incrementAndGet() }
}

/**
 * Creates a [CallbackManager] which is preferable to the regular [CallbackManager]
 * in situations where more than one host is connecting to the store at a time.
 *
 * @param baseData a salt of sorts, used to help in making callback IDs more unique across hosts.
 * @param random source of randomness to use when generating callback IDs.
 */
fun <T> randomCallbackManager(
    baseData: String,
    random: Random
): CallbackManager<T> = CallbackManager { currentlyUsedTokens ->
    var unique = random.nextInt()
    var tokenString = "$unique::$baseData"

    while (tokenString.hashCode() in currentlyUsedTokens) {
        unique = random.nextInt()
        tokenString = "$unique::$baseData"
    }

    tokenString.hashCode()
}
