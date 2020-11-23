package arcs.android.crdt

import arcs.core.crdt.CrdtException

/** Serializes a [CrdtException] to its proto form. */
fun CrdtException.toProto(): CrdtExceptionProto {
  val builder = CrdtExceptionProto.newBuilder()
    .setMessage(message)
    .addAllStackTrace(stackTrace.map { it.toString() })
  // Serialize the cause message as well, unfortunately we don't propagate the cause stack trace.
  cause?.let { builder.setCauseMessage(it.toString()) }
  return builder.build()
}

fun CrdtExceptionProto.decode(): CrdtException {
  return CrdtException(
    message = message,
    cause = if (causeMessage.isNotEmpty()) Throwable(causeMessage) else null
  )
}
