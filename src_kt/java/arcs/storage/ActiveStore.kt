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
 * Representation of an active store.
 *
 * Subclasses of this must provide specific behavior as-controlled by the [StorageMode] provided
 * within the [StoreOptions].
 */
abstract class ActiveStore<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
  options: StoreOptions<Data, Op, ConsumerData>
) : IStore<Data, Op, ConsumerData> {
  override val existenceCriteria: ExistenceCriteria = options.existenceCriteria
  override val mode: StorageMode = options.mode
  override val storageKey: StorageKey = options.storageKey
  override val type: Type = options.type

  val baseStore: Store<Data, Op, ConsumerData> = options.baseStore

  open suspend fun idle() = Unit

  abstract suspend fun getLocalData(): Data
}
