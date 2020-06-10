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
import arcs.core.storage.Reference

/** Constructs a [ReferencableList] from the given [ReferencablePrimitiveListProto]. */
fun ReferencableReferenceListProto.toReferencableList(): ReferencableList<Referencable> {
    val fieldType = FieldType.EntityRef(type)
    return valueList.mapTo(mutableListOf<Reference>()) {
        it.toReference()
    }.toReferencable(fieldType)
}

/** Serializes a [ReferencablePrimitive] to its proto form. */
fun ReferencableList<*>.toReferenceListProto(): ReferencableReferenceListProto {
    val type = itemType
    return when (type) {
        is FieldType.EntityRef -> {
            ReferencableReferenceListProto
                .newBuilder()
                .setType(type.schemaHash)
                .addAllValue(value.map {
                    require(it is Reference) {
                        "Non-reference found in reference list"
                    }
                    it.toProto()
                })
                .build()
        }
        else -> throw IllegalStateException("Invalid FieldType for ReferencableList of references")
    }
}

/** Reads a [ReferencableRefenceList] out of a [Parcel]. */
fun Parcel.readOrderedReferenceList(): ReferencableList<*>? =
    readProto(ReferencableReferenceListProto.getDefaultInstance())?.toReferencableList()
