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

/** Describes a claim in a trusted particle. */
sealed class Claim {
  /** A claim to specify that [target] is only derived from [source]. */
  data class DerivesFrom(val target: AccessPath, val source: AccessPath) : Claim() {
    override fun toString() = "$target derives-from $source"
  }

  /** A claim to specify that labels on [accessPath] satisfy [predicate]. */
  data class Assume(val accessPath: AccessPath, val predicate: Predicate) : Claim() {
    override fun toString() = "$accessPath is $predicate"
  }

  /** Returns a new claim with [AccessPath] in the claim instantiated for the given [particle]. */
  fun instantiateFor(particle: Recipe.Particle): Claim {
    return when (this) {
      is Assume -> Assume(accessPath.instantiateFor(particle), predicate)
      is DerivesFrom -> DerivesFrom(
        target = target.instantiateFor(particle),
        source = source.instantiateFor(particle)
      )
    }
  }
}
