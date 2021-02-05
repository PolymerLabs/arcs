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

package arcs.core.crdt.testutil

import arcs.core.crdt.CrdtEntity
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.ReferencablePrimitive

fun <T> CrdtEntity.Data.primitiveSingletonValue(field: String): T {
  return (singletons[field]!!.consumerView!!.unwrap() as ReferencablePrimitive<T>).value
}

fun <T> CrdtEntity.Data.primitiveSingletonListValue(field: String): List<T> {
  return (singletons[field]!!.consumerView!!.unwrap() as ReferencableList<ReferencablePrimitive<T>>)
    .value.map { it.value }
}

fun CrdtEntity.Data.singletonInlineEntity(field: String): RawEntity {
  return singletons[field]!!.consumerView!!.unwrap() as RawEntity
}

fun CrdtEntity.Data.singletonIsNull(field: String): Boolean {
  return singletons[field]!!.consumerView == null
}
