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
import arcs.core.data.HandleConnectionSpec.Direction
import arcs.core.data.ParticleSpec

typealias DirectionProto = HandleConnectionSpecProto.Direction

/** Converts [HandleConnectionSpecProto.Direction] to [HandleConnectionSpec.Direction]. */
fun DirectionProto.decode() =
    when (this) {
        DirectionProto.READS -> Direction.READS
        DirectionProto.WRITES -> Direction.WRITES
        DirectionProto.READS_WRITES -> Direction.READS_WRITES
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
fun ParticleSpecProto.decode() = ParticleSpec(
    name = getName(),
    connections = getConnectionsList().map { it.decode() },
    location = getLocation()
)
