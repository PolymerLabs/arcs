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

/** Class contains information that is required when decoding particle protos.
 *
 * @property particleSpecs [ParticleSpec] instances in the context indexed by name.
 * @property recipeHandles [Handle] instances in a [Recipe] indexed by name.
 */
class DecodingContext(
    var particleSpecs: Map<String, ParticleSpec>,
    var recipeHandles: Map<String, Handle>
)

/** Converts a [HandleConnectionProto] into a [Handle]. */
fun HandleConnectionProto.decode(particleSpec: ParticleSpec, context: DecodingContext): Handle {
    val handleSpec = particleSpec.connections[name]
    requireNotNull(handleSpec) {
        "HandleConnection '$name' not found in ParticleSpec '${particleSpec.name}'."
    }
    val recipeHandle = context.recipeHandles[handle]
    requireNotNull(recipeHandle) {
        "Handle '$handle' not found when decoding ParticleProto '${particleSpec.name}'."
    }
    return recipeHandle
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
    return Particle(particleSpec, handleConnections)
}
