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

/** Specification of an Arcs [Particle]. */
data class ParticleSpec(
    /** The name of the particle. */
    val name: String,
    /** All the handle connections of the particle indexed by the connection name. */
    val connections: Map<String, HandleConnectionSpec>,
    /** The location of the implementation. */
    val location: String,
    val claims: List<Claim> = emptyList(),
    val checks: List<Check> = emptyList(),
    val annotations: List<Annotation> = emptyList()
) {
    /** Indicates whether the particle is an isolated (non-egress) particle. */
    val isolated: Boolean
        get() {
            val isolated = annotations.any { it.name == "isolated" }
            val egress = annotations.any { it.name == "egress" }
            require(!(isolated && egress)) {
                "Particle cannot be tagged with both @isolated and @egress."
            }
            return isolated
        }

    /**
     * Indicates whether the particle is an egress (non-isolated) particle.
     *
     * Particles are considered egress particles by default.
     */
    val egress: Boolean
        get() = !isolated

    /** Optional egress type of the particle. Always null for isolated particles. */
    val egressType: String?
        get() {
            val egress = annotations.find { it.name == "egress" } ?: return null
            return egress.getOptionalStringParam("type")
        }
}
