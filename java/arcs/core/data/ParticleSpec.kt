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
    val dataflowType: ParticleDataflowType
        get() {
            val isolated = annotations.any { it.name == "isolated" }
            val ingress = annotations.any { it.name == "ingress" }
            val egress = annotations.any { it.name == "egress" }
            require(!(isolated && ingress)) {
                "Particle cannot be tagged with both @isolated and @ingress."
            }
            require(!(isolated && egress)) {
                "Particle cannot be tagged with both @isolated and @egress."
            }
            return when {
                ingress && egress -> ParticleDataflowType.IngressAndEgress
                ingress -> ParticleDataflowType.Ingress
                egress -> ParticleDataflowType.Egress
                isolated -> ParticleDataflowType.Isolated
                else -> {
                    // Particles with no annotations are considered ingress and egress by default.
                    ParticleDataflowType.IngressAndEgress
                }
            }
        }

    /** Optional egress type of the particle. Always null for non-egress particles. */
    val egressType: String?
        get() {
            val egress = annotations.find { it.name == "egress" } ?: return null
            return egress.getOptionalStringParam("type")
        }
}

/** Indicates the flow of data into/out of a particle. */
enum class ParticleDataflowType(val isolated: Boolean, val ingress: Boolean, val egress: Boolean) {
    Isolated(isolated = true, ingress = false, egress = false),
    Ingress(isolated = false, ingress = true, egress = false),
    Egress(isolated = false, ingress = false, egress = true),
    IngressAndEgress(isolated = false, ingress = true, egress = true)
}
