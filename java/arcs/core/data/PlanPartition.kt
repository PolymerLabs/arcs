/*
 * Copyright 2019 Google LLC.
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
 * A [PlanPartition] is a part of a [Plan] that runs on an [ArcHost]. Since [Plan]s may span
 * multiple [ArcHost]s, an [Allocator] must partition a plan by [ArcHost].
 */
data class PlanPartition(
    val arcId: String,
    val arcHost: String,
    val particles: List<ParticleSpec>
)
