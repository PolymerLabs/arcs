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

import arcs.core.data.PlanPartition
import arcs.core.util.guardWith
import arcs.sdk.Particle
import kotlin.reflect.KClass
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Base helper class for [ArcHost] implementations to provide implementation of
 * registration.
 */
abstract class AbstractArcHost : ArcHost {
    private var particles: MutableList<ParticleIdentifier> = mutableListOf()

    override val hostId = this::class.java.canonicalName!!

    protected fun registerParticle(particle: ParticleIdentifier) {
        particles.add(particle)
    }

    protected fun unregisterParticle(particle: ParticleIdentifier) {
        particles.remove(particle)
    }

    override suspend fun registeredParticles(): List<ParticleIdentifier> = particles
}
