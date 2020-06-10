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
import arcs.core.data.PrimitiveType
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable

/** Constructs a [ReferencableList] from the given [ReferencablePrimitiveListProto]. */
fun ReferencablePrimitiveListProto.toReferencableList(): ReferencableList<Referencable> {
    val fieldType = FieldType.Primitive(PrimitiveType.values()[type])
    return valueList.mapTo(mutableListOf<ReferencablePrimitive<*>>()) {
        it.toReferencablePrimitive()
    }.toReferencable(fieldType)
}

/** Serializes a [ReferencablePrimitive] to its proto form. */
fun ReferencableList<*>.toPrimitiveListProto(): ReferencablePrimitiveListProto {
    val type = itemType
    return when (type) {
        is FieldType.Primitive -> ReferencablePrimitiveListProto
            .newBuilder()
            .setType(type.primitiveType.ordinal)
            .addAllValue(value.map {
                require(it is ReferencablePrimitive<*>) {
                    "Non-primitive found in primitive list"
                }
                it.toProto()
            })
            .build()
        else -> throw IllegalStateException("Invalid FieldType for primitive ReferencableList")
    }
}

/** Reads a [ReferencablePrimitive] out of a [Parcel]. */
fun Parcel.readOrderedPrimitiveList(): ReferencableList<*>? =
    readProto(ReferencablePrimitiveListProto.getDefaultInstance())?.toReferencableList()
