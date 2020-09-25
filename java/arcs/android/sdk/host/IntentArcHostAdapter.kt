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
package arcs.android.sdk.host

import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ResultReceiver
import arcs.android.host.parcelables.ParcelableParticleIdentifier
import arcs.core.common.ArcId
import arcs.core.common.toArcId
import arcs.core.data.Plan
import arcs.core.host.ArcHost
import arcs.core.host.ArcState
import arcs.core.host.ArcStateChangeCallback
import arcs.core.host.ArcStateChangeRegistration
import arcs.core.host.ParticleIdentifier
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * An [ArcHost] stub that translates API calls into [Intent]s directed at a [Service] using
 * [ArcHostHelper] to dispatch them to corresponding [ArcHost] methods.
 *
 * @param arcHostComponentName the [ComponentName] of the [Service]
 * @property hostId the hostId of the remote [ArcHost] instance
 * @param sender a callback used to fire the [Intent], overridable to allow testing
 */
class IntentArcHostAdapter(
  arcHostComponentName: ComponentName,
  override val hostId: String,
  sender: (Intent) -> Unit
) : IntentHostAdapter(arcHostComponentName, sender), ArcHost {

  override suspend fun registeredParticles(): List<ParticleIdentifier> {
    return sendIntentToHostServiceForResult(
      hostComponentName.createGetRegisteredParticlesIntent(hostId)
    ) {
      (it as? List<*>)?.map { identifier ->
        (identifier as ParcelableParticleIdentifier).actual
      }
    } ?: emptyList()
  }

  override suspend fun startArc(partition: Plan.Partition) {
    sendIntentToHostServiceForResult(
      partition.createStartArcHostIntent(hostComponentName, hostId)
    )
  }

  override suspend fun stopArc(partition: Plan.Partition) {
    sendIntentToHostService(
      partition.createStopArcHostIntent(hostComponentName, hostId)
    )
  }

  override suspend fun pause() {
    sendIntentToHostServiceForResult(hostComponentName.createPauseArcHostIntent(hostId))
  }

  override suspend fun unpause() {
    sendIntentToHostServiceForResult(hostComponentName.createUnpauseArcHostIntent(hostId))
  }

  override suspend fun waitForArcIdle(arcId: String) =
    TODO("watForArcIdle not yet threaded through intent")

  override suspend fun lookupArcHostStatus(partition: Plan.Partition): ArcState {
    return sendIntentToHostServiceForResult(
      partition.createLookupArcStatusIntent(hostComponentName, hostId)
    ) {
      try {
        ArcState.fromString(it.toString())
      } catch (e: IllegalArgumentException) {
        ArcState.errorWith(e)
      }
    } ?: ArcState.Error
  }

  override suspend fun isHostForParticle(particle: Plan.Particle) =
    registeredParticles().contains(ParticleIdentifier.from(particle.location))

  private class ResultReceiverStateChangeHandler(
    val block: (ArcId, ArcState) -> Unit
  ) : ResultReceiver(Handler(Looper.getMainLooper())) {
    override fun onReceiveResult(resultCode: Int, resultData: Bundle?) {
      val scope = CoroutineScope(
        EmptyCoroutineContext + Dispatchers.Default + Job() + CoroutineName(
          "ArcStateChange"
        )
      )
      scope.launch {
        val arcId = requireNotNull(
          resultData?.getString(ArcHostHelper.EXTRA_ARCSTATE_CHANGED_ARCID)
        ) {
          "Missing arcId in Intent for onArcStateChangeHandler callback."
        }.toArcId()
        val arcState = requireNotNull(
          resultData?.getString(ArcHostHelper.EXTRA_ARCSTATE_CHANGED_ARCSTATE)
        ) {
          "Missing state in Intent for onArcStateChangeHandler callback."
        }.let {
          ArcState.fromString(it)
        }
        block(arcId, arcState)
      }
    }
  }

  override suspend fun addOnArcStateChange(
    arcId: ArcId,
    block: ArcStateChangeCallback
  ): ArcStateChangeRegistration {
    return sendIntentToHostServiceForResult(
      hostComponentName.createAddOnArcStateChangeIntent(
        hostId,
        arcId,
        ResultReceiverStateChangeHandler(block)
      )
    ) {
      ArcStateChangeRegistration(requireNotNull(it) {
        "No callbackId supplied from addOnStateChangeCallback"
      }.toString())
    } ?: throw IllegalArgumentException("Unable to register state change listener")
  }

  override fun hashCode(): Int = hostId.hashCode()

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (javaClass != other?.javaClass) return false
    other as ArcHost
    return hostId == other.hostId
  }
}
