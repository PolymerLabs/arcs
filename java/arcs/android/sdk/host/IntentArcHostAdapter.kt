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
import arcs.android.host.parcelables.ParcelableParticleIdentifier
import arcs.core.data.Plan
import arcs.core.host.ArcHost
import arcs.core.host.ArcState
import arcs.core.host.ParticleIdentifier

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
        sendIntentToHostServiceForResult(
            partition.createStopArcHostIntent(hostComponentName, hostId)
        )
    }

    override suspend fun lookupArcHostStatus(partition: Plan.Partition): ArcState {
        return sendIntentToHostServiceForResult(
            partition.createLookupArcStatusIntent(hostComponentName, hostId)
        ) {
            try {
                ArcState.valueOf(it.toString())
            } catch (e: IllegalArgumentException) {
                ArcState.Error
            }
        } ?: ArcState.Error
    }

    override suspend fun isHostForParticle(particle: Plan.Particle) =
        registeredParticles().contains(ParticleIdentifier.from(particle.location))

    override fun hashCode(): Int = hostId.hashCode()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as ArcHost
        return hostId == other.hostId
    }
}
