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

/**
 * An [ArcHost] manages the instantiation and execution of particles participating in an Arc by
 * responding to `startArc` and `stopArc` messages from an [Allocator], starting or stopping
 * particles, and connecting them to storage keys.
 */
interface ArcHost {
    /** A canonical identifying ID for this host. */
    val hostId: String

    /** Returns a list of Particles registered to run in this host. */
    suspend fun registeredParticles(): List<ParticleIdentifier>

    /**
     * Requests this arc host to start or restart an Arc associated with this [Plan.Partition]. This
     * may include creating handles and storage proxies, registering for updates from the storage
     * system, instantiating particles, and registering for resurrection.
     */
    suspend fun startArc(partition: Plan.Partition)

    /**
     * Shuts down an existing arc. This may include unregistering for updates from storage,
     * resurrection, and notifying particles they are at the end of their lifecycle.
     */
    suspend fun stopArc(partition: Plan.Partition)
    // TODO: HandleMessage

    /**
     * Returns true if the provided [Plan.Particle] can be loaded by this [ArcHost].
     */
    suspend fun isHostForParticle(particle: Plan.Particle): Boolean
}
