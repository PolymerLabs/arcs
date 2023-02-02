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

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.common.Referencable
import arcs.core.data.FieldType
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.toReferencable
import arcs.core.storage.RawReference

/** Constructs a [ReferencableList] from the given [ReferencableReferenceListProto]. */
fun ReferencableReferenceListProto.toReferencableList(): ReferencableList<Referencable> {
  val fieldType = FieldType.EntityRef(type)
  return valueList.mapTo(mutableListOf<RawReference>()) {
    it.toRawReference()
  }.toReferencable(FieldType.ListOf(fieldType))
}

/** Serializes a [ReferencableList] of references to its proto form. */
fun ReferencableList<*>.toReferenceListProto(): ReferencableReferenceListProto {
  val type = (itemType as FieldType.ListOf).primitiveType
  return when (type) {
    is FieldType.EntityRef -> {
      ReferencableReferenceListProto
        .newBuilder()
        .setType(type.schemaHash)
        .addAllValue(
          value.map {
            require(it is RawReference) {
              "Non-reference found in ReferencableList of references"
            }
            it.toProto()
          }
        )
        .build()
    }
    else -> throw IllegalStateException(
      "Invalid FieldType $type for ReferencableList of references"
    )
  }
}

/** Reads a [ReferencableReferenceList] of references out of a [Parcel]. */
fun Parcel.readOrderedReferenceList(): ReferencableList<*>? =
  readProto(ReferencableReferenceListProto.getDefaultInstance())?.toReferencableList()
