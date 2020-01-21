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
package arcs.core.host

import arcs.core.sdk.Particle
import arcs.core.util.guardWith
import kotlin.reflect.KClass
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Base helper class for [ArcHost] implementations to provide implementation of
 * registration.
 */
abstract class AbstractArcHost : ArcHost {
    private val hostMutex = Mutex()
    private var particles: MutableList<KClass<out Particle>> by
        guardWith(hostMutex, mutableListOf())

    override suspend fun registerParticle(particle: KClass<out Particle>) {
        hostMutex.withLock { particles.add(particle) }
    }

    override suspend fun unregisterParticle(particle: KClass<out Particle>) {
        hostMutex.withLock { particles.remove(particle) }
    }

    override suspend fun registeredParticles(): List<KClass<out Particle>> =
        hostMutex.withLock { particles }

    override suspend fun startArc(partition: PlanPartition) {

        // TODO(cromwellian): implement
    }

    override suspend fun stopArc(partition: PlanPartition) {
        // TODO(cromwellian): implement
    }
}
