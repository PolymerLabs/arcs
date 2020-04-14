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

import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.util.Result
import arcs.core.util.resultOf

typealias DirectionProto = HandleConnectionSpecProto.Direction

/** Converts [HandleConnectionSpecProto.Direction] to [HandleConnectionSpec.Direction]. */
fun DirectionProto.decode() =
    when (this) {
        DirectionProto.UNSPECIFIED ->
            throw IllegalArgumentException("Direction not set in [HandleConnectionSpec]")
        DirectionProto.READS -> HandleMode.Read
        DirectionProto.WRITES -> HandleMode.Write
        DirectionProto.READS_WRITES -> HandleMode.ReadWrite
        DirectionProto.UNRECOGNIZED ->
            throw IllegalArgumentException("Invalid direction when decoding [HandleConnectionSpec]")
    }

/** Converts a [HandleConnnectionSpecProto] to the corresponding [HandleConnectionSpec] instance. */
fun HandleConnectionSpecProto.decode() = HandleConnectionSpec(
    name = getName(),
    direction = getDirection().decode(),
    type = getType().decode()
)

/** Converts a [ParticleSpecProto] to the corresponding [ParticleSpec] instance. */
fun ParticleSpecProto.decode(): Result<ParticleSpec> = resultOf {
    val connections = mutableMapOf<String, HandleConnectionSpec>()
    connectionsList.forEach {
        val oldValue = connections.put(it.name, it.decode())
        require(oldValue == null) {
            "Duplicate connection '${it.name}' when decoding ParticleSpecProto '$name'"
        }
    }
    ParticleSpec(name, connections, location)
}
