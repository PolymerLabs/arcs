package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.crdt.CrdtEntity

/** Constructs a [CrdtEntity.ReferenceImpl] from the given [CrdtEntityReferenceProto]. */
fun fromProto(proto: CrdtEntityReferenceProto) = CrdtEntity.ReferenceImpl(proto.id)

/** Serializes a [CrdtEntity.ReferenceImpl] to its proto form. */
fun CrdtEntity.ReferenceImpl.toProto() = CrdtEntityReferenceProto.newBuilder().setId(id).build()

/** Reads a [CrdtEntity.ReferenceImpl] out of a [Parcel]. */
fun Parcel.readCrdtEntityReference(): CrdtEntity.ReferenceImpl? =
    readProto(CrdtEntityReferenceProto.getDefaultInstance())?.let { fromProto(it) }
