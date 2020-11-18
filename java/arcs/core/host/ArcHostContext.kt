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
import arcs.core.util.TaggedLog
import kotlinx.atomicfu.atomic

/**
 * Runtime context state needed by the [ArcHost] on a per [ArcId] basis. For each [Arc],
 * maintains the state fo the arc, as well as a map of the [ParticleContext] information for
 * each participating [Particle] in the [Arc].
 */
data class ArcHostContext(
  var arcId: String,
  var particles: MutableList<ParticleContext> = mutableListOf(),
  val initialArcState: ArcState = ArcState.NeverStarted
) {
  private val stateChangeCallbacks: MutableMap<ArcStateChangeRegistration,
    ArcStateChangeCallback> = mutableMapOf()

  private val _arcState = atomic(initialArcState)

  var arcState: ArcState
    get() = _arcState.value
    set(state) {
      val previous = _arcState.getAndSet(state)
      if (previous != state) {
        fireArcStateChanged(state)
      }
    }

  override fun toString() = "ArcHostContext(arcId=$arcId, arcState=$arcState, " +
    "particles=$particles"

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

  private fun fireArcStateChanged(state: ArcState) {
    stateChangeCallbacks.values.toList().forEach { callback ->
      try {
        callback(arcId.toArcId(), state)
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
  fun allReadableStorageKeys() = particles.flatMap { particleContext ->
    particleContext.planParticle.handles.filter {
      it.value.mode.canRead
    }.map { it.value.storageKey }
  }.distinct()

  companion object {
    private val log = TaggedLog { "ArcHostContext" }
  }
}
