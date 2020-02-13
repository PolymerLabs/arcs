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

import arcs.core.data.ParticleSpec
import arcs.core.storage.Handle
import arcs.sdk.Particle

/**
 * Holds per-[Particle] context state needed by [ArcHost]
 */
class ParticleContext(
    val handles: MutableMap<String, Handle<*,*,*>> = mutableMapOf(),
    val particle: Particle
)

/**
 * Runtime context state needed by the [ArcHost] on a per [ArcId] basis.
 */
class ArcHostContext(
    var particles: MutableMap<ParticleSpec, ParticleContext> = mutableMapOf()
)
