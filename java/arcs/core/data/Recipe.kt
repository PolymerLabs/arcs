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

import arcs.core.type.Type

/** Representation of recipe in an Arcs manifest. */
data class Recipe(
    val name: String,
    val handles: Map<String, Handle>,
    val particles: List<Particle>
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
        val storageKey: String,
        val type: Type,
        val associatedHandles: List<String>
    ) {
        // TODO(bgogul): associatedHandles should be changed to List<Handle>.
        enum class Fate {
            CREATE, USE, MAP, COPY, JOIN
        }
    }
}
