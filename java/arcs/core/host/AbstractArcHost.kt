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

/**
 * Base helper class for [ArcHost] implementations to provide implementation of
 * registration.
 */
abstract class AbstractArcHost : ArcHost {
    var particles: MutableList<Class<out Particle>> = mutableListOf()

    override fun registerParticle(particle: Class<out Particle>) {
        particles.add(particle)
    }

    override fun unregisterParticle(particle: Class<out Particle>) {
        particles.remove(particle)
    }

    override fun registeredParticles(): List<Class<out Particle>> {
        return particles
    }
}
