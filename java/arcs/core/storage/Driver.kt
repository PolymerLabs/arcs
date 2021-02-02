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

package arcs.core.storage

import kotlin.reflect.KClass

/** Listener for changes to the [Data] managed by a [Driver]. */
typealias DriverReceiver<Data> = suspend (data: Data, version: Int) -> Unit

/**
 * Interface that all drivers must support.
 *
 * Note the threading of a version number here; each model provided by the [Driver] to the [ActiveStore]
 * (using a receiver registered with [registerReceiver]) is paired with a version, as is each model
 * sent from the [ActiveStore] to the driver (using [send]).
 *
 * This threading is used to track whether driver state has changed while the [ActiveStore] is processing
 * a particular model. [send] should always fail if the version isn't exactly `1` greater than the
 * current internal version.
 *
 * Note that the [Driver] is *not* a thread-safe interface! Calls to [registerReceiver] and [send]
 * should take place from the same thread that creates the Driver.
 */
interface Driver<Data : Any> {
  /** Key identifying the [Driver]. */
  val storageKey: StorageKey
  /** Kotlin class for provided Data generic, i.e. class representing what's being stored. */
  val dataClass: KClass<Data>
  /**
   * Returns a token that represents the current state of the data.
   *
   * This can be provided to [registerReceiver], and will impact what data is delivered on
   * initialization (only "new" data should be delivered, though note that this can be satisfied
   * by sending a model for merging rather than by remembering a set of ops).
   */
  val token: String?

  /** Registers a listener for [Data]. */
  suspend fun registerReceiver(token: String? = null, receiver: DriverReceiver<Data>)

  /**
   * Sends data to the [Driver] for storage.
   *
   * If the data is stored successfully, this method will call any registered [DriverReceiver]
   * with the stored [Data] and updated version, before returning True to the caller.
   *
   * If the data is not stored successfully, this method will return False. This in turn implies
   * that the caller should wait for its [DriverReceiver] to be called before attempting to
   * call [send] again.
   **/
  suspend fun send(data: Data, version: Int): Boolean

  /** Closes the driver and releases any held resources. */
  suspend fun close() = Unit

  /** Creates a copy of this [Driver] that is registered to the same storage. */
  suspend fun clone(): Driver<Data>
}
