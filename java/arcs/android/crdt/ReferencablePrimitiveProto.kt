package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.data.util.ReferencablePrimitive

/** Constructs a [ReferencablePrimitive] from the given [ReferencablePrimitiveProto]. */
fun ReferencablePrimitiveProto.toReferencablePrimitive(): ReferencablePrimitive<*> = requireNotNull(
    ReferencablePrimitive.unwrap(id)
) { "Unable to parse ReferencablePrimitive from $id." }

/** Serializes a [ReferencablePrimitive] to its proto form. */
fun ReferencablePrimitive<*>.toProto() = ReferencablePrimitiveProto.newBuilder().setId(id).build()

/** Reads a [ReferencablePrimitive] out of a [Parcel]. */
fun Parcel.readReferencablePrimitive(): ReferencablePrimitive<*>? =
    readProto(ReferencablePrimitiveProto.getDefaultInstance())?.toReferencablePrimitive()
