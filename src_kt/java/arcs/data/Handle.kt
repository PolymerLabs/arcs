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

package arcs.data

import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation
import arcs.type.Type

interface Handle<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
  // TODO: lots
}

/** Defines a [Type] which is capable of creating a [Handle]. */
interface HandleCreatorType<Data : CrdtData, Op : CrdtOperation, ConsumerData> : Type {
  /** Creates a new handle. */
  fun createHandle(): Handle<Data, Op, ConsumerData>
}
