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

package arcs.crdt

import arcs.common.Referencable
import arcs.crdt.internal.VersionMap
import arcs.data.Entity

/**
 * A [CrdtModel] capable of managing a complex entity consisting of named [CrdtSingleton]s and named
 * [CrdtSet]s, each of which can manage various types of [Referencable] data.
 */
class CrdtEntity : CrdtModel<CrdtEntity.Data, CrdtEntity.Operation, Entity> {
  override val data: Data
    get() = TODO("not implemented")
  override val consumerView: Entity
    get() = TODO("not implemented")

  override fun merge(other: Data): MergeChanges<Data, Operation> {
    TODO("not implemented")
  }

  override fun applyOperation(op: Operation): Boolean {
    TODO("not implemented")
  }

  override fun updateData(newData: Data) {
    TODO("not implemented")
  }

  data class Data(
    override var versionMap: VersionMap,
    val singletons: Map<String, CrdtSingleton<Referencable>>,
    val collections: Map<String, CrdtSet<Referencable>>
  ) : CrdtData

  sealed class Operation : CrdtOperation
}
