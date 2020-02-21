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

package arcs.android.host.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.core.data.Plan

/** [Parcelable] variant of [Plan.Particle]. */
data class ParcelableParticle(
    override val actual: Plan.Particle
) : ActualParcelable<Plan.Particle> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.particleName)
        parcel.writeString(actual.location)
        parcel.writeMap(
            actual.handles.mapValues { ParcelableHandleConnection(it.value) }
        )
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableParticle> {
        override fun createFromParcel(parcel: Parcel): ParcelableParticle {
            val particleName = requireNotNull(parcel.readString()) {
                "No ParticleName found in Parcel"
            }
            val location = requireNotNull(parcel.readString()) {
                "No Location found in Parcel"
            }
            val handles = mutableMapOf<String, ParcelableHandleConnection>()
            parcel.readMap(handles as Map<*, *>, this::class.java.classLoader)

            return ParcelableParticle(
                Plan.Particle(particleName, location, handles.mapValues { it.value.actual })
            )
        }

        override fun newArray(size: Int): Array<ParcelableParticle?> = arrayOfNulls(size)
    }
}

/** Wraps a [Particle] as a [ParcelableParticle]. */
fun Plan.Particle.toParcelable(): ParcelableParticle = ParcelableParticle(this)

/** Writes a [Particle] to a [Parcel]. */
fun Parcel.writeParticle(particle: Plan.Particle, flags: Int) =
    writeTypedObject(particle.toParcelable(), flags)

/** Reads a [Particle] from a [Parcel]. */
fun Parcel.readParticle(): Plan.Particle? = readTypedObject(ParcelableParticle)?.actual
