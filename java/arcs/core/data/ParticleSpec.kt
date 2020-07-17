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
    /** Indicates whether the particle is an isolated (non-egress) particle. */
    val isolated: Boolean = false
)
