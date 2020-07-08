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
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.toReferencable

/** Constructs a [ReferencableList] from the given [ReferencablePrimitiveListProto]. */
fun ReferencableInlineEntityListProto.toReferencableList(): ReferencableList<Referencable> {
    val fieldType = FieldType.InlineEntity(type)
    return valueList.mapTo(mutableListOf<RawEntity>()) {
        it.toRawEntity()
    }.toReferencable(FieldType.ListOf(fieldType))
}

/** Serializes a [ReferencablePrimitive] to its proto form. */
fun ReferencableList<*>.toInlineEntityListProto(): ReferencableInlineEntityListProto {
    val type = (itemType as FieldType.ListOf).primitiveType
    return when (type) {
        is FieldType.InlineEntity -> {
            ReferencableInlineEntityListProto
                .newBuilder()
                .setType(type.schemaHash)
                .addAllValue(value.map {
                    require(it is RawEntity) {
                        "Non-entity found in entity list"
                    }
                    it.toProto()
                })
                .build()
        }
        else -> throw IllegalStateException(
            "Invalid FieldType $type for ReferencableList of references"
        )
    }
}

/** Reads a [ReferencableRefenceList] out of a [Parcel]. */
fun Parcel.readOrderedInlineEntityList(): ReferencableList<*>? =
    readProto(ReferencableInlineEntityListProto.getDefaultInstance())?.toReferencableList()
