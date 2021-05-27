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

package arcs.core.data.proto

import arcs.core.data.Check
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.expression.PaxelParser
import arcs.core.data.expression.stringify

typealias DirectionProto = HandleConnectionSpecProto.Direction

/** Converts [HandleConnectionSpecProto.Direction] to [HandleMode]. */
fun DirectionProto.decode() =
  when (this) {
    DirectionProto.UNSPECIFIED ->
      throw IllegalArgumentException("Direction not set in [HandleConnectionSpec]")
    DirectionProto.READS -> HandleMode.Read
    DirectionProto.WRITES -> HandleMode.Write
    DirectionProto.QUERY -> HandleMode.Query
    DirectionProto.READS_WRITES -> HandleMode.ReadWrite
    DirectionProto.READS_QUERY -> HandleMode.ReadQuery
    DirectionProto.WRITES_QUERY -> HandleMode.WriteQuery
    DirectionProto.READS_WRITES_QUERY -> HandleMode.ReadWriteQuery
    DirectionProto.UNRECOGNIZED ->
      throw IllegalArgumentException("Invalid direction when decoding [HandleConnectionSpec]")
  }

/** Converts a [HandleMode] to a [HandleConnectionSpecProto.Direction]. */
fun HandleMode.encode(): DirectionProto = when (this) {
  HandleMode.Read -> DirectionProto.READS
  HandleMode.Write -> DirectionProto.WRITES
  HandleMode.Query -> DirectionProto.QUERY
  HandleMode.ReadWrite -> DirectionProto.READS_WRITES
  HandleMode.ReadQuery -> DirectionProto.READS_QUERY
  HandleMode.WriteQuery -> DirectionProto.WRITES_QUERY
  HandleMode.ReadWriteQuery -> DirectionProto.READS_WRITES_QUERY
}

/** Converts a [HandleConnnectionSpecProto] to the corresponding [HandleConnectionSpec] instance. */
fun HandleConnectionSpecProto.decode() = HandleConnectionSpec(
  name = name,
  direction = direction.decode(),
  type = type.decode(),
  expression = if (expression.isEmpty()) {
    null
  } else {
    PaxelParser.parse(expression)
  }
)

/** Converts a [HandleConnectionSpec] into a [HandeConnectionSpecProto]. */
fun HandleConnectionSpec.encode(): HandleConnectionSpecProto {
  val builder = HandleConnectionSpecProto.newBuilder()
    .setName(name)
    .setDirection(direction.encode())
    .setType(type.encode())

  expression?.let { builder.setExpression(it.stringify()) }

  return builder.build()
}

/** Converts a [ParticleSpecProto] to the corresponding [ParticleSpec] instance. */
fun ParticleSpecProto.decode(): ParticleSpec {
  val connections = mutableMapOf<String, HandleConnectionSpec>()
  connectionsList.forEach {
    val oldValue = connections.put(it.name, it.decode())
    require(oldValue == null) {
      "Duplicate connection '${it.name}' when decoding ParticleSpecProto '$name'"
    }
  }
  val claims = claimsList.map { it.decode(connections) }
  val checks = checksList.map {
    Check(it.accessPath.decode(connections), it.predicate.decode())
  }
  val annotations = annotationsList.map { it.decode() }
  return ParticleSpec(name, connections, location, claims, checks, annotations)
}

/** Converts a [ParticleSpec] into a [ParticleSpecProto]. */
fun ParticleSpec.encode(): ParticleSpecProto = ParticleSpecProto.newBuilder()
  .setName(name)
  .addAllConnections(connections.values.map { it.encode() })
  .setLocation(location)
  .addAllClaims(claims.map { it.encode() })
  .addAllChecks(checks.map { it.encode() })
  .addAllAnnotations(annotations.map { it.encode() })
  .build()
