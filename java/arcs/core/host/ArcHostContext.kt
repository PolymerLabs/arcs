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
package arcs.core.host

import arcs.core.data.Plan
import arcs.core.storage.api.Handle

/**
 * Holds per-[Particle] context state needed by [ArcHost]
 */
data class ParticleContext(
    val particle: Particle,
    val handles: MutableMap<String, Handle> = mutableMapOf(),
    var particleState: ParticleState = ParticleState.Instantiated,
    /** Used to detect infinite-crash loop particles */
    var consecutiveFailureCount: Int = 0
)

/**
 * Runtime context state needed by the [ArcHost] on a per [ArcId] basis.
 */
data class ArcHostContext(
    var particles: MutableMap<Plan.Particle, ParticleContext> = mutableMapOf(),
    var arcState: ArcState = ArcState.NeverStarted
)
