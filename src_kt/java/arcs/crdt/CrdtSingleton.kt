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

import arcs.crdt.internal.Actor
import arcs.crdt.internal.Referencable
import arcs.crdt.internal.VersionMap

/**
 * TODO: Implement me.
 */
class CrdtSingleton<T : Referencable> : CrdtModel<CrdtSingleton.Data<T>, CrdtSingleton.Operation<T>, T?> {
  override val data: Data<T>
    get() = TODO("not implemented")
  override val consumerView: T?
    get() = TODO("not implemented")

  override fun merge(other: Data<T>): MergeChanges<Data<T>, Operation<T>> {
    TODO("not implemented")
  }

  override fun applyOperation(op: Operation<T>): Boolean {
    TODO("not implemented")
  }

  override fun updateData(newData: Data<T>) {
    TODO("not implemented")
  }

  data class Data<T : Referencable> internal constructor(
    override val versionMap: VersionMap,
    val values: Map<String, Pair<T?, VersionMap>>
  ) : CrdtData

  sealed class Operation<T>(
    open val actor: Actor,
    open val clock: VersionMap
  ) : CrdtOperation {
    data class Set<T> internal constructor(
      val value: T,
      override val actor: Actor,
      override val clock: VersionMap
    ) : Operation<T>(actor, clock)

    data class Clear<T> internal constructor(
      override val actor: Actor,
      override val clock: VersionMap
    ) : Operation<T>(actor, clock)
  }
}
