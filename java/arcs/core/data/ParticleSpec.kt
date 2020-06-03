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
 * This class contains metadata about a [Particle] in a [Recipe].
 *
 * @property name the name of the particle.
 * @property connections all the handle connections of the particle indexed by the connection name.
 * @property location the location of the implementation.
 */
data class ParticleSpec(
    val name: String,
    val connections: Map<String, HandleConnectionSpec>,
    val location: String,
    val claims: List<Claim> = emptyList(),
    val checks: List<Check> = emptyList()
)
