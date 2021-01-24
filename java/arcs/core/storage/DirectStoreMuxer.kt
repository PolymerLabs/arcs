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

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.type.Type
import arcs.core.util.MutableBiMap

/** A [DirectStoreMuxer] that accepts any data type. */
typealias UntypedDirectStoreMuxer = DirectStoreMuxer<CrdtData, CrdtOperation, Any?>

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
   * Register a callback with the [DirectStoreMuxer] that will receive callbacks for
   * [DirectStore] instances. The message will be wrapped in a [MuxedProxyMessage] with [muxId]
   * representing the [entityId] of the entity.
   */
  suspend fun on(callback: MuxedProxyCallback<Data, Op, T>): CallbackToken

  /**
   * Remove a previously-registered [MuxedProxyCallback] identified by the provided [CallbackToken].
   */
  suspend fun off(callbackToken: CallbackToken)

  /**
   * Gets data from the store corresponding to the given [muxId].
   *
   * The [CallbackToken] is provided to ensure a callback is registered to the [DirectStore] for the
   * corresponding [CallbackToken].
   */
  suspend fun getLocalData(muxId: String, callbackToken: CallbackToken): Data

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

  /**
   * Returns the [StoreRecord] for a given [muxId].
   *
   * Also ensures a callback is registered to the [DirectStore] and the [StoreRecord.tokenMap] is
   * updated to associate the [CallbackToken] to the created `callbackTokenForStore`.
   *
   * This is public to be visible by tests, but should otherwise not be used outside of
   * [DirectStoreMuxer].
   */
  suspend fun getStore(muxId: String, callbackToken: CallbackToken): StoreRecord<Data, Op, T>

  // VisibleForTesting
  val stores: Map<String, StoreRecord<Data, Op, T>>

  // VisibleForTesting
  data class StoreRecord<Data : CrdtData, Op : CrdtOperation, T>(
    /** Maps between client-facing [CallbackToken] and internal store-facing [CallbackToken] */
    val tokenMap: MutableBiMap<Int, Int>,
    val store: DirectStore<Data, Op, T>
  )
}
