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
import kotlinx.atomicfu.update

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
  val tokenGenerator: TokenGenerator
) {

  // Note: interactions with the callbackMap should be in a synchronized block. During registration
  // we need to stop changes to the callbacksMap during the period between generating a unique
  // token for the current map and the addition of that callback and token to the map.
  private var callbacksMap = atomic(emptyMap<Int, Callback<T>>())

  private var hasEverSetCallback = atomic(false)

  val callbacks: Collection<Callback<T>>
    get() = callbacksMap.value.values

  // TODO(b/173041765) This is included for the consistentState method in [DirectStoreMuxerImpl].
  // Eventually, we should refactor that class so it doesn't need access to internal state.
  val activeTokens: Collection<Int>
    get() = callbacksMap.value.keys

  /** Adds a [ProxyCallback] to the collection, and returns its token. */
  fun register(callback: Callback<T>): Int {
    // The callbacksMap.update block may run multiple times, if other operations were
    // concurrently modifying the callbacksMap. Since the tokenGenerator needs an accurate set
    // of keys to prevent collision, we use this mutable var to return the final token value
    // actually used by the update block.
    var token: Int = 0
    callbacksMap.update {
      token = tokenGenerator(it.keys)
      it + (token to callback)
    }
    hasEverSetCallback.value = true
    return token
  }

  /**
   * Removes the callback with the given [callbackToken] from the collection.
   */
  fun unregister(callbackToken: Int) {
    callbacksMap.update { it - callbackToken }
  }

  /** Gets a particular [Callback] by its [callbackToken]. */
  fun getCallback(callbackToken: Int?): Callback<T>? {
    return callbacksMap.value[callbackToken]
  }

  /** Return all callbacks excluding the one with the provided token, if it exists. */
  fun allCallbacksExcept(exclude: Int?): Collection<Callback<T>> {
    return callbacksMap.value
      .filterKeys { it != exclude }
      .values
  }

  /** True if no callbacks are registered. */
  fun isEmpty(): Boolean {
    return callbacksMap.value.isEmpty()
  }

  /** True if no callbacks are registered, and at least one has been registered before. */
  fun hasBecomeEmpty(): Boolean {
    return hasEverSetCallback.value && callbacksMap.value.isEmpty()
  }

  /** Remove all currently registered callbacks. */
  fun clear() {
    callbacksMap.value = emptyMap()
  }
}

/**
 * Creates a [CallbackManager] that uses a [RandomTokenGenerator] for callback token generation.
 *
 * @param baseData a salt of sorts, used to help in making callback IDs more unique across hosts.
 * @param random source of randomness to use when generating callback IDs.
 */
fun <T> callbackManager(
  baseData: String,
  random: Random
): CallbackManager<T> = CallbackManager(
  RandomTokenGenerator(baseData, random)
)
