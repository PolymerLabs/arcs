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
 * An [ArcHost] manages the instantiation and execution of particles participating in an Arc by
 * responding to `startArc` and `stopArc` messages from an [Allocator], starting or stopping
 * particles, and connecting them to storage keys.
 */
interface ArcHost {

    /**
     * Registers a [Particle] class with this host.
     */
    fun registerParticle(particle: KClass<out Particle>)

    /**
     * Unregisters a [Particle] class.
     */
    fun unregisterParticle(particle: KClass<out Particle>)

    /**
     * Returns a list of Particles registered to run in this host.
     */
    val registeredParticles: List<KClass<out Particle>>

    // TODO: Implement startArc/stopArc/handleMessage
}
