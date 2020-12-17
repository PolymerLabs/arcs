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
package arcs.core.allocator

import arcs.core.common.ArcId
import arcs.core.data.Plan

/**
 * Denotes a component capable of starting [Arc]s (given [Plan] information), and stopping those
 * [Arc]s.
 */
interface ArcController {
  /** Starts an [Arc] defined by the given [plan] and returns it. */
  suspend fun startArcForPlan(plan: Plan): Arc

  /** Stops an [Arc] with the given [arcId] if it was running. */
  suspend fun stopArc(arcId: ArcId)
}
