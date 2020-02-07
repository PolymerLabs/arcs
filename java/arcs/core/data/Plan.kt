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

/**
 * A [Plan] is usually produced by running the build time Particle Accelerator tool, it consists
 * of a set of specs for handles, particles used in a recipe, and mappings between them.
 */
open class Plan(
    // TODO(cromwellian): add more fields as needed (e.g. RecipeName, etc for debugging)
    val particles: List<ParticleSpec>
) {
    // Because Plan is not a data class to allow sub-classing, these are required.
    override fun equals(other: Any?): Boolean {
        if (this === other) return true

        return (other as? Plan)?.let { particles == other.particles } ?: false
    }

    override fun hashCode(): Int {
        return particles.hashCode()
    }
}
