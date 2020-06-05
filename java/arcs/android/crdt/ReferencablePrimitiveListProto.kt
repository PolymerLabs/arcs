package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.toReferencable

/** Constructs a [ReferencableList] from the given [ReferencablePrimitiveListProto]. */
fun ReferencablePrimitiveListProto.toReferencableList(): ReferencableList<*> = 
  valueList.mapTo(mutableListOf<Any>()) { it.toReferencablePrimitive().value!! }.toReferencable()

/** Serializes a [ReferencablePrimitive] to its proto form. */
fun ReferencableList<*>.toProto() = ReferencablePrimitiveListProto.newBuilder().addAllValue(value.map { it.toReferencable().toProto() }).build()

/** Reads a [ReferencablePrimitive] out of a [Parcel]. */
fun Parcel.readOrderedListPrimitive(): ReferencableList<*>? =
    readProto(ReferencablePrimitiveListProto.getDefaultInstance())?.toReferencableList()
