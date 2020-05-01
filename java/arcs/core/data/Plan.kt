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

import arcs.core.storage.StorageKey
import arcs.core.type.Type
import arcs.core.util.lens

/**
 * A [Plan] is usually produced by running the build time Particle Accelerator tool, it consists
 * of a set of specs for handles, particles used in a recipe, and mappings between them.
 */
open class Plan(
    // TODO(cromwellian): add more fields as needed (e.g. RecipeName, etc for debugging)
    val particles: List<Particle>,
    val arcId: String? = null
) {
    /**
     * A [Particle] consists of the information necessary to instantiate a particle
     * when starting an arc.
     * @property particleName is human readable name of the Particle in the recipe.
     * @property location is either a fully qualified Java class name, or a filesystem path.
     * @property handles is a map from particle connection name to connection info.
     */
    data class Particle(
        val particleName: String,
        val location: String,
        val handles: Map<String, HandleConnection>
    ) {
        companion object {
            val handlesLens = lens(Particle::handles) { t, f -> t.copy(handles = f) }
        }
    }

    /** Represents a use of a [Handle] by a [Particle]. */
    data class HandleConnection(
        val storageKey: StorageKey,
        val mode: HandleMode,
        val type: Type,
        val ttl: Ttl? = null
    ) {
        companion object {
            val storageKeyLens =
                lens(HandleConnection::storageKey) { t, f -> t.copy(storageKey = f) }
        }
    }

    /**
     * A [Plan.Partition] is a part of a [Plan] that runs on an [ArcHost]. Since [Plan]s may span
     * multiple [ArcHost]s, an [Allocator] must partition a plan by [ArcHost].
     */
    data class Partition(
        val arcId: String,
        val arcHost: String,
        val particles: List<Particle>
    ) {
        companion object {
            val particlesLens = lens(Partition::particles) { t, f -> t.copy(particles = f) }
        }
    }

    // Because Plan is not a data class to allow sub-classing, these are required.
    override fun equals(other: Any?): Boolean {
        if (this === other) return true

        return (other as? Plan)?.particles == particles
    }

    override fun hashCode(): Int = particles.hashCode()

    companion object {
        val particleLens = lens(Plan::particles) { t, f -> Plan(particles = f, arcId = t.arcId) }
    }
}
