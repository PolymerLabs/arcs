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

import arcs.core.data.HandleConnectionSpec.Direction
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Plan.HandleConnection
import arcs.core.data.Plan.Particle

/** Class contains information that is required when decoding particle protos. */
class DecodingContext(
    var particleSpecs: Map<String, ParticleSpec>,
    var handleProtos: Map<String, HandleProto>
)

/** Converts a [HandleConnectionProto] into a [HandleConnection]. */
fun HandleConnectionProto.decode(
    particleSpec: ParticleSpec,
    context: DecodingContext
): HandleConnection {
    val handleSpec = particleSpec.connections[name]
    requireNotNull(handleSpec) {
        "HandleConnectionSpec '$name' not found in ParticleSpec '${particleSpec.name}'."
    }
    val handleProto = context.handleProtos[handle]
    requireNotNull(handleProto) {
        "HandleProto for '$handle' not found when decoding ParticleProto '${particleSpec.name}'."
    }
    val handleMode = when (handleSpec.direction) {
        Direction.READS -> HandleMode.Read
        Direction.WRITES -> HandleMode.Write
        Direction.READS_WRITES -> HandleMode.ReadWrite
    }
    return handleProto.decodeAsHandleConnection(handleMode)
}

/** Converts a [ParticleProto] into a [Particle]. */
fun ParticleProto.decode(context: DecodingContext): Particle {
    val particleSpec = context.particleSpecs[specName]
    requireNotNull(particleSpec) {
        "ParticleSpec '$specName' not found in decoding context."
    }
    val handleConnections = connectionsList.map {
        it.name to it.decode(particleSpec, context)
    }.toMap()
    return Particle(specName, particleSpec.location, handleConnections)
}
