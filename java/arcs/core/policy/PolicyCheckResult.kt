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

import arcs.core.data.Check

/**
 * The possible results of a call to check the adherence to a [Policy]: either [Pass] or [Fail].
 */
sealed class PolicyCheckResult {
  /** Denotes a successful policy check. */
  object Pass : PolicyCheckResult()

  /** Denotes a failed policy check. */
  data class Fail(val message: String) : PolicyCheckResult() {
    constructor(violations: List<Check>) : this(violations.toString())
  }
}

/**
 * Pseudo-constructor to return the appropriate version of PolicyCheckResult based on whether
 * the provided [violations] list is empty.
 */
fun PolicyCheckResult(violations: List<Check>): PolicyCheckResult {
  return if (violations.isEmpty()) PolicyCheckResult.Pass else PolicyCheckResult.Fail(violations)
}
