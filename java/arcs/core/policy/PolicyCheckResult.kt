/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.policy

/**
 * The possible results of a call to check the adherence to a [Policy]: either [Pass] or [Fail].
 */
sealed class PolicyCheckResult {
  /** Denotes a successful policy check. */
  object Pass : PolicyCheckResult()

  /** Denotes a failed policy check. */
  data class Fail(val message: String) : PolicyCheckResult()
}
