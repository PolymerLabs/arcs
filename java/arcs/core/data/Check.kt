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

import arcs.core.data.InformationFlowLabel.Predicate

/** Describes a check in a trusted particle. */
sealed class Check {
    /** A check to specify that the labels on [accessPath] satisfy [predicate]. */
    data class Assert(val accessPath: AccessPath, val predicate: Predicate) : Check() {
        override fun toString() = "$accessPath is $predicate"
    }

    /** Returns a new check with [AccessPath] in the claim instantiated for the given [particle]. */
    fun instantiateFor(particle: Recipe.Particle): Check {
        this as Assert
        return Assert(accessPath.instantiateFor(particle), predicate)
    }
}
