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
data class Check(val accessPath: AccessPath, val predicate: Predicate) {
  override fun toString() = "$accessPath is $predicate"

  /** Returns a new check with [AccessPath] in the claim instantiated for the given [particle]. */
  fun instantiateFor(particle: Recipe.Particle): Check {
    return Check(accessPath.instantiateFor(particle), predicate)
  }
}
