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

package arcs.android.crdt

import arcs.core.crdt.CrdtModel
import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.SingletonType
import arcs.core.type.Type

/** Enumeration of the parcelable [CrdtModel] types. */
enum class ParcelableCrdtType {
  Count,
  Set,
  Singleton,
  Entity,
}

fun Type.toParcelableType() = when (this) {
  is CountType -> ParcelableCrdtType.Count
  is CollectionType<*> -> ParcelableCrdtType.Set
  is SingletonType<*> -> ParcelableCrdtType.Singleton
  is EntityType -> ParcelableCrdtType.Entity
  else ->
    throw IllegalArgumentException("Service store can't handle type $this")
}
