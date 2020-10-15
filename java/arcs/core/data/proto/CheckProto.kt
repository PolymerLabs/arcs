package arcs.core.data.proto

import arcs.core.data.Check
import arcs.core.data.HandleConnectionSpec

/** Decodes an [CheckProto] into [Check]. */
fun CheckProto.decode(
  connectionSpecs: Map<String, HandleConnectionSpec>
): Check {
  return Check(
    accessPath = accessPath.decode(connectionSpecs),
    predicate = predicate.decode()
  )
}

fun Check.encode(): CheckProto {
  return CheckProto.newBuilder()
    .setAccessPath(accessPath.encode())
    .setPredicate(predicate.encode())
    .build()
}
