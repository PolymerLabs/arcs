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

import arcs.core.common.ArcId
import arcs.core.common.toArcId
import arcs.core.data.Plan
import arcs.core.entity.Handle
import arcs.core.host.api.Particle
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.util.TaggedLog

/**
 * Holds per-[Particle] context state needed by [ArcHost] to implement [Particle] lifecycle.
 * TODO: this now has active logic and probably shouldn't be a data class
 *
 * @property particle currently instantiated [Particle] class
 * @property planParticle the [Plan.Particle] used to instantiate [particle]
 * @property handles a map of each handle created for [particle]
 * @property particleState the current state the particle lifecycle is in
 * @property consecutiveFailureCount how many times this particle failed to start in a row
 * @property awaitingReady set of handles that expect to receive a `ready` StorageEvent
 * @property desyncedHandles set of handles that are currently desynchronized from storage
 */
data class ParticleContext(
    val particle: Particle,
    val planParticle: Plan.Particle,
    val handles: MutableMap<String, Handle> = mutableMapOf(),
    var particleState: ParticleState = ParticleState.Instantiated,
    /** Used to detect infinite-crash loop particles */
    var consecutiveFailureCount: Int = 0
) {
    private var isWriteOnly = true
    private val awaitingReady: MutableSet<Handle> = mutableSetOf()
    private val desyncedHandles: MutableSet<Handle> = mutableSetOf()

    /**
     * Track which handles are expecting [StorageEvent.READY] notifications,
     * so we can invoke [Particle.onReady] once they have all fired.
     */
    fun expectReady(handle: Handle) {
        isWriteOnly = false
        awaitingReady.add(handle)
    }

    /**
     * Particles with only write-only handles won't receive any storage events and thus
     * need to have their `onReady` method invoked as a special case.
     *
     * This will be executed in the context of the StorageProxy's scheduler.
     */
    fun notifyWriteOnlyParticles() {
        if (isWriteOnly) {
            particleState = ParticleState.Running
            particle.onReady()
        }
    }

    /**
     * Called by [StorageProxy] when it receives storage events. This is responsible for
     * driving the particle lifecycle API and managing the running particle state.
     *
     * This will be executed in the context of the StorageProxy's scheduler.
     */
    fun notify(event: StorageEvent, handle: Handle) {
        when (event) {
            StorageEvent.READY -> {
                if (awaitingReady.remove(handle) && awaitingReady.isEmpty()) {
                    particleState = ParticleState.Running
                    particle.onReady()
                }
            }
            StorageEvent.UPDATE -> {
                if (particleState == ParticleState.Started) {
                    particle.onUpdate()
                }
            }
            StorageEvent.DESYNC -> {
                if (desyncedHandles.isEmpty()) {
                    particleState = ParticleState.Desynced
                    particle.onDesync()
                }
                desyncedHandles.add(handle)
            }
            StorageEvent.RESYNC -> {
                desyncedHandles.remove(handle)
                if (desyncedHandles.isEmpty()) {
                    particleState = ParticleState.Running
                    particle.onResync()
                }
            }
        }
    }
}

/**
 * Runtime context state needed by the [ArcHost] on a per [ArcId] basis. For each [Arc],
 * maintains the state fo the arc, as well as a map of the [ParticleContext] information for
 * each participating [Particle] in the [Arc].
 */
data class ArcHostContext(
    var arcId: String,
    var particles: MutableMap<String, ParticleContext> = mutableMapOf(),
    var entityHandleManager: EntityHandleManager
) {
    private val stateChangeCallbacks: MutableMap<ArcStateChangeRegistration,
        ArcStateChangeCallback> = mutableMapOf()

    private var _arcState = ArcState.NeverStarted

    var arcState: ArcState
        get() = _arcState
        set(state) {
            if (_arcState != state) {
                _arcState = state
                fireArcStateChanged()
            }
        }

    constructor(
        arcId: String,
        particles: MutableMap<String, ParticleContext> = mutableMapOf(),
        arcState: ArcState = ArcState.NeverStarted,
        entityHandleManager: EntityHandleManager
    ) : this(arcId, particles, entityHandleManager) {
        _arcState = arcState
    }

    internal fun addOnArcStateChange(
        registration: ArcStateChangeRegistration,
        block: ArcStateChangeCallback
    ): ArcStateChangeRegistration {
        stateChangeCallbacks[registration] = block
        return registration
    }

    internal fun remoteOnArcStateChange(registration: ArcStateChangeRegistration) {
        stateChangeCallbacks.remove(registration)
    }

    private fun fireArcStateChanged() {
        stateChangeCallbacks.values.forEach { callback ->
            try {
                callback(arcId.toArcId(), _arcState)
            } catch (e: Exception) {
                log.debug(e) {
                    "Exception in onArcStateChangeCallback for $arcId"
                }
            }
        }
    }

    /**
     * Traverse every handle and return a distinct collection of all [StorageKey]s
     * that are readable by this arc.
     */
    fun allReadableStorageKeys() = particles.flatMap { (_, particleContext) ->
        particleContext.planParticle.handles.filter {
            it.value.mode.canRead
        }.map { it.value.storageKey }
    }.distinct()

    companion object {
        private val log = TaggedLog { "ArcHostContext" }
    }
}
