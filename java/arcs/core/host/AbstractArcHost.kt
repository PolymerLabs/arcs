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
import kotlin.reflect.KClass

/**
 * Base helper class for [ArcHost] implementations to provide implementation of
 * registration.
 */
abstract class AbstractArcHost : ArcHost {
    private var particles: MutableList<KClass<out Particle>> = mutableListOf()

    override fun registerParticle(particle: KClass<out Particle>) {
        particles.add(particle)
    }

    override fun unregisterParticle(particle: KClass<out Particle>) {
        particles.remove(particle)
    }

    override val registeredParticles: List<KClass<out Particle>>
        get() = particles

    override fun startArc(partition: PlanPartition) {

        // TODO(cromwellian): implement
    }

    override fun stopArc(partition: PlanPartition) {
        // TODO(cromwellian): implement
    }
}
