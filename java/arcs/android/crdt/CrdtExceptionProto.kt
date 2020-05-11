package arcs.android.crdt

import arcs.core.crdt.CrdtException

/** Serializes a [CrdtException] to its proto form. */
fun CrdtException.toProto(): CrdtExceptionProto {
    return CrdtExceptionProto.newBuilder()
        .setMessage(message)
        .addAllStackTrace(stackTrace.map { it.toString() })
        .build()
}
