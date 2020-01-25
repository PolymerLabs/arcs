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

import arcs.core.data.ParticleSpec
import arcs.core.data.PlanPartition
import arcs.sdk.Particle
import kotlin.reflect.KClass

/**
 * An [ArcHost] manages the instantiation and execution of particles participating in an Arc by
 * responding to `startArc` and `stopArc` messages from an [Allocator], starting or stopping
 * particles, and connecting them to storage keys.
 */
interface ArcHost {
    /**
     * Return a unique identifier for this host instance.
     */
    suspend fun hostId(): String

    /**
     * Registers a [Particle] class with this host.
     */
    suspend fun registerParticle(particle: ParticleIdentifier): Unit

    /**
     * Unregisters a [Particle] class.
     */
    suspend fun unregisterParticle(particle: ParticleIdentifier): Unit

    /**
     * Returns a list of Particles registered to run in this host.
     */
    suspend fun registeredParticles(): List<ParticleIdentifier>

    /**
     * Requests this arc host to start or restart an Arc associated with this [PlanPartition]. This
     * may include creating handles and storage proxies, registering for updates from the storage
     * system, instantiating particles, and registering for resurrection.
     */
    suspend fun startArc(partition: PlanPartition)

    /**
     * Shuts down an existing arc. This may include unregistering for updates from storage,
     * resurrection, and notifying particles they are at the end of their lifecycle.
     */
    suspend fun stopArc(partition: PlanPartition)
    // TODO: HandleMessage

    /** A canonical identifying ID for this host. */
    val hostName: String

    /**
     * Returns true if the provided [ParticleSpec] can be loaded by this [ArcHost].
     */
    suspend fun isHostForSpec(spec: ParticleSpec): Boolean
}
