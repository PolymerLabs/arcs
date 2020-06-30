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

import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe.Handle
import arcs.core.data.Recipe.Particle
import arcs.core.data.Recipe.Particle.HandleConnection

/**
 * Class contains information that is required when decoding particle protos.
 *
 * @property particleSpecs [ParticleSpec] instances in the context indexed by name.
 * @property recipeHandles [Handle] instances in a [Recipe] indexed by name.
 */
data class DecodingContext(
    var particleSpecs: Map<String, ParticleSpec>,
    var recipeHandles: Map<String, Handle>
)

/** Converts a [HandleConnectionProto] into a [Recipe.Particle.HandleConnection]. */
fun HandleConnectionProto.decode(
    particleSpec: ParticleSpec,
    context: DecodingContext
): HandleConnection {
    val handleSpec = requireNotNull(particleSpec.connections[name]) {
        "HandleConnection '$name' not found in ParticleSpec '${particleSpec.name}'."
    }
    val recipeHandle = requireNotNull(context.recipeHandles[handle]) {
        "Handle '$handle' not found when decoding ParticleProto '${particleSpec.name}'."
    }
    return HandleConnection(handleSpec, recipeHandle, type.decode())
}

/** Converts a [ParticleProto] into a [Recipe.Particle]. */
fun ParticleProto.decode(context: DecodingContext): Particle {
    val particleSpec = requireNotNull(context.particleSpecs[specName]) {
        "ParticleSpec '$specName' not found in decoding context."
    }
    val handleConnections = connectionsList.map { it.decode(particleSpec, context) }
    return Particle(particleSpec, handleConnections)
}
