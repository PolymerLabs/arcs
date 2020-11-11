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

package arcs.core.data.util

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.data.FieldType

/**
 * Represents a list of primitives which can be referenced - and thus used
 * as field values by CRDT Collections & Singletons.
 */
data class ReferencableList<T : Referencable>(
  val value: List<T>,
  val itemType: FieldType
) : Referencable {
  override val id: ReferenceId
    get() = "ReferencableList(${value.hashCode()})"

  override fun toString(): String = "List($value)"
}

/**
 * Converts a [List] of [Referencable]s into a [ReferencableList]. The [itemType] supplied helps
 * identify the type of item managed by the list instance when serializing/deserializing the data.
 */
// TODO(b/172974333): Make the itemType argument passed here the type of the *item*, not the type of
//  the list.
fun List<Referencable>.toReferencable(itemType: FieldType): ReferencableList<Referencable> {
  require(itemType is FieldType.ListOf) {
    "ReferencableLists must have List itemTypes, instead $itemType was provided"
  }
  return ReferencableList(this, itemType)
}
