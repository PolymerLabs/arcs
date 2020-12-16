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
import arcs.core.host.api.Particle
import arcs.core.storage.StorageKey
import arcs.core.util.TaggedLog
import kotlinx.atomicfu.atomic

/**
 * Runtime context state needed by the [ArcHost] on a per [ArcId] basis. For each [Arc],
 * maintains the state fo the arc, as well as a map of the [ParticleContext] information for
 * each participating [Particle] in the [Arc].
 *
 * **Note** This class is *not* threadsafe by itself.
 */
class ArcHostContext(
  val arcId: String,
  particles: List<ParticleContext> = emptyList(),
  initialArcState: ArcState = ArcState.NeverStarted
) {
  private val _particles: MutableList<ParticleContext> = particles.toMutableList()
  private val _arcState = atomic(initialArcState)

  private val stateChangeCallbacks: MutableMap<ArcStateChangeRegistration, ArcStateChangeCallback> =
    mutableMapOf()

  var arcState: ArcState
    get() = _arcState.value
    set(state) {
      val previous = _arcState.getAndSet(state)
      if (previous != state) {
        fireArcStateChanged(state)
      }
    }

  val particles: List<ParticleContext> = _particles

  /** Adds a [ParticleContext] to this [ArcHostContext]. */
  fun addParticle(context: ParticleContext) {
    _particles.add(context)
  }

  /**
   * Sets a [ParticleContext] at a particular position within the [ArcHostContext]'s particle list.
   */
  fun setParticle(index: Int, context: ParticleContext) {
    _particles[index] = context
  }

  /**
   * Associates the provided [block] as a listener to be notified when [arcState] changes. The
   * [registration] is used to uniquely-identify the [block].
   */
  fun addOnArcStateChange(
    registration: ArcStateChangeRegistration,
    block: ArcStateChangeCallback
  ): ArcStateChangeRegistration {
    stateChangeCallbacks[registration] = block
    return registration
  }

  /**
   * Removes an [arcState] change listener identified by the provided [registration].
   */
  fun removeOnArcStateChange(registration: ArcStateChangeRegistration) {
    stateChangeCallbacks.remove(registration)
  }

  /**
   * Traverse every handle and return a distinct collection of all [StorageKey]s
   * that are readable by this arc.
   */
  fun allReadableStorageKeys(): List<StorageKey> {
    return particles.flatMap { particleContext ->
      particleContext.planParticle.handles
        .filter { it.value.mode.canRead }
        .map { it.value.storageKey }
    }.distinct()
  }

  override fun toString() =
    "ArcHostContext(arcId=$arcId, arcState=$arcState, particles=$particles)"

  private fun fireArcStateChanged(state: ArcState) {
    stateChangeCallbacks.values.toList().forEach { callback ->
      try {
        callback(arcId.toArcId(), state)
      } catch (e: Exception) {
        log.debug(e) { "Exception in onArcStateChangeCallback for $arcId" }
      }
    }
  }

  companion object {
    private val log = TaggedLog { "ArcHostContext" }
  }
}
