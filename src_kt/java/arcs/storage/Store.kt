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

package arcs.storage

import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation
import arcs.type.Type

/**
 * A representation of a store.
 *
 * **Note:** Initially a constructed store will be inactive - it will not connect to a driver, will
 * not accept connections from StorageProxy objects, and no data will be read or written.
 *
 * Calling [activate] will generate an interactive store and return it.
 */
class Store<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
  options: StoreOptions<Data, Op, ConsumerData>
) : IStore<Data, Op, ConsumerData> {
  override val storageKey: StorageKey = options.storageKey
  override var existenceCriteria: ExistenceCriteria = options.existenceCriteria
  override val mode: StorageMode = options.mode
  override val type: Type = options.type
  private var activeStore: ActiveStore<Data, Op, ConsumerData>? = null
    get() = synchronized(this) { field }
    set(value) = synchronized(this) { field = value }

  /**
   * If there's a parsed model then it's stored here and provided to [activate] when reconstituting
   * an [ActiveStore].
   */
  var model: Data? = options.model
  private val parsedVersionToken: String? = options.versionToken
  val versionToken: String?
    get() = activeStore?.versionToken ?: parsedVersionToken

  @Suppress("UNCHECKED_CAST")
  suspend fun activate(): ActiveStore<Data, Op, ConsumerData> {
    activeStore?.let { return it }

    require(mode in CONSTRUCTORS) { "StorageMode $mode not yet implemented" }
    val constructor =
      requireNotNull(CONSTRUCTORS[mode]) { "No constructor registered for mode $mode" }

    val activeStore = checkNotNull(
      constructor(
        StoreOptions(
          storageKey = storageKey,
          existenceCriteria = existenceCriteria,
          type = type,
          mode = mode,
          baseStore = this,
          versionToken = parsedVersionToken,
          model = model
        )
      ) as? ActiveStore<Data, Op, ConsumerData>
    ) { "Could not cast constructed store to ActiveStore${constructor.typeParamString}" }
    existenceCriteria = ExistenceCriteria.ShouldExist
    this.activeStore = activeStore
    return activeStore
  }

  companion object {
    private val CONSTRUCTORS = mapOf(
      StorageMode.Direct to DirectStore.CONSTRUCTOR
    )
  }
}
