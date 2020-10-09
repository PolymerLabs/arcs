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
import arcs.core.crdt.CrdtOperation
import arcs.core.type.Type

/**
 * An collection of [DirectStore]s that allows multiple CRDT models to be stored as sub-keys
 * of a single [StorageKey] location.
 *
 * This is what *backs* Entities.
 */
interface DirectStoreMuxer<Data : CrdtData, Op : CrdtOperation, T> {
  val storageKey: StorageKey
  val backingType: Type

  /**
   * Register a callback with the [DirectStoreMuxer] that will receive callbacks for all
   * [DirectStore] instnaces that are currently active. The message will be wrapped in a
   * [MuxedProxyMessage] with [muxId] representing the [entityId] of the entity.
   */
  fun on(callback: MuxedProxyCallback<Data, Op, T>): Int

  /**
   * Remove a previously-registered [MuxedProxyCallback] identified by the provided [token].
   */
  fun off(token: Int)

  /**
   * Gets data from the store corresponding to the given [referenceId].
   *
   * [callbackId] does not serve a purpose yet, however it will be used to ensure a callback is
   * registered to the [DirectStore] for the corresponding [callbackId]
   */
  suspend fun getLocalData(referenceId: String, callbackId: Int): Data

  /** Removes [DirectStore] caches and closes those that can be closed safely. */
  suspend fun clearStoresCache()

  /** Calls [idle] on all existing contained stores and waits for their completion. */
  suspend fun idle()

  /**
   * Sends the [ProxyMessage] to the store backing `muxId`.
   *
   * A new store will be created for the `muxId`, if necessary.
   */
  suspend fun onProxyMessage(muxedMessage: MuxedProxyMessage<Data, Op, T>)

  // VisibleForTesting
  val stores: Map<String, StoreRecord<Data, Op, T>>

  // VisibleForTesting
  data class StoreRecord<Data : CrdtData, Op : CrdtOperation, T>(
    val id: Int,
    val store: DirectStore<Data, Op, T>
  )
}
