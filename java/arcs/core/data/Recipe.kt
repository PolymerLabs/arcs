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

package arcs.core.data

import arcs.core.storage.StorageKeyParser
import arcs.core.type.Type

/** Representation of recipe in an Arcs manifest. */
data class Recipe(
    val name: String?,
    val handles: Map<String, Handle>,
    val particles: List<Particle>,
    val arcId: String?
) {
    /** Representation of a particle in a recipe. */
    data class Particle(
        val spec: ParticleSpec,
        val handleConnections: List<HandleConnection>
    ) {
        /** Representation of a handle connection in a particle. */
        data class HandleConnection(
            val spec: HandleConnectionSpec,
            val handle: Handle
        )
    }

    /** Definition of a handle in a recipe. */
    data class Handle(
        val name: String,
        val fate: Fate,
        val type: Type,
        val storageKey: String? = null,
        val capabilities: Capabilities? = null,
        val associatedHandles: List<String> = emptyList()
    ) {
        // TODO(bgogul): associatedHandles should be changed to List<Handle>.
        enum class Fate {
            CREATE, USE, MAP, COPY, JOIN
        }
    }
}

/** Translates a [Recipe] into a [Plan] */
fun Recipe.toPlan() = Plan(
    arcId = arcId,
    particles = particles.map { it.toPlanParticle() }
)

/** Translates a [Recipe.Particle] into a [Plan.Particle] */
fun Recipe.Particle.toPlanParticle() = Plan.Particle(
    particleName = spec.name,
    location = spec.location,
    handles = handleConnections.associate { it.spec.name to it.toPlanHandleConnection() }
)

/** Translates a [Recipe.Particle.HandleConnection] into a [Plan.HandleConnection] */
fun Recipe.Particle.HandleConnection.toPlanHandleConnection() = Plan.HandleConnection(
    mode = spec.direction,
    type = spec.type,
    storageKey = handle.toStorageKey()
    // TODO: Add TTL.
)

/** Translates a [Recipe.Handle] into a [StorageKey] */
fun Recipe.Handle.toStorageKey() = when {
    storageKey != null -> StorageKeyParser.parse(storageKey)
    capabilities != null -> CreateableStorageKey(name, capabilities)
    else -> CreateableStorageKey(name)
}
