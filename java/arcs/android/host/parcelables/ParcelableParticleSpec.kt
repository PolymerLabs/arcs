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
import arcs.core.host.ParticleSpec

/** [Parcelable] variant of [ParticleSpec]. */
data class ParcelableParticleSpec(override val actual: ParticleSpec) :
    ActualParcelable<ParticleSpec> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.particleName)
        parcel.writeString(actual.location)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableParticleSpec> {
        override fun createFromParcel(parcel: Parcel): ParcelableParticleSpec {

            val particleName = requireNotNull(parcel.readString()) {
                "No ParticleName found in Parcel"
            }

            val location = requireNotNull(parcel.readString()) {
                "No Location found in Parcel"
            }

            return ParcelableParticleSpec(ParticleSpec(particleName, location))
        }

        override fun newArray(size: Int): Array<ParcelableParticleSpec?> = arrayOfNulls(size)
    }
}

/** Wraps a [ParticleSpec] as a [ParcelableParticleSpec]. */
fun ParticleSpec.toParcelable(): ParcelableParticleSpec = ParcelableParticleSpec(this)

/** Writes a [ParticleSpec] to a [Parcel]. */
fun Parcel.writeParticleSpec(particleSpec: ParticleSpec, flags: Int) =
    writeTypedObject(particleSpec.toParcelable(), flags)

/** Reads a [ParticleSpec] from a [Parcel]. */
fun Parcel.readParticleSpec(): ParticleSpec? = readTypedObject(ParcelableParticleSpec)?.actual
