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
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.data.RawEntity

/**
 * An interface defining a method that will create a particular [ActivateStore] instance
 * based on provided [StoreOptions] of the same type.
 *
 * An implementation of this interface should be passed to the `activate` method
 * of an inactive [Store].
 */
interface ActivationFactory<Data : CrdtData, Op : CrdtOperation, T> {
    suspend operator fun invoke(options: StoreOptions<Data, Op, T>): ActiveStore<Data, Op, T>
}

/** Type-alias for an [ActivationFactory] to use when de-referencing [Reference]s. */
typealias EntityActivationFactory =
    ActivationFactory<CrdtEntity.Data, CrdtEntity.Operation, RawEntity>
