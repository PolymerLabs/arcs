package arcs.core.host

import arcs.core.common.ArcId
import arcs.core.data.Plan

/** Fake [ArcHost] used in Tests */
class NoOpArcHost(override val hostId: String) : ArcHost {

  /** Property used to test [pause] and [unpause] methods. */
  var isPaused = false

  override suspend fun registeredParticles(): List<ParticleIdentifier> = emptyList()

  override suspend fun startArc(partition: Plan.Partition) = Unit

  override suspend fun stopArc(partition: Plan.Partition) = Unit

  override suspend fun lookupArcHostStatus(partition: Plan.Partition): ArcState =
    ArcState.Indeterminate

  override suspend fun isHostForParticle(particle: Plan.Particle): Boolean = false

  override suspend fun pause() {
    require(!isPaused) {
      "Can only pause an ArcHost that is currently unpaused."
    }
    isPaused = true
  }

  override suspend fun unpause() {
    require(isPaused) {
      "Can only unpause an ArcHost that is currently paused."
    }
    isPaused = false
  }

  override suspend fun waitForArcIdle(arcId: String) = Unit

  override suspend fun addOnArcStateChange(
    arcId: ArcId,
    block: ArcStateChangeCallback
  ): ArcStateChangeRegistration =
    throw NotImplementedError("Method not implemented for NoOpArcHost.")
}
