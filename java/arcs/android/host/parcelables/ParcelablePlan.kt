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
import arcs.core.data.ParticleSpec
import arcs.core.data.Plan

/** [Parcelable] variant of [Plan]. */
data class ParcelablePlan(override val actual: Plan) : ActualParcelable<Plan> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(actual.particles.size)
        actual.particles.forEach {
            parcel.writeParticleSpec(it, 0)
        }
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelablePlan> {
        override fun createFromParcel(parcel: Parcel): ParcelablePlan {
            val size = requireNotNull(parcel.readInt()) {
                "No size of ParticleSpecs found in Parcel"
            }
            val particleSpecs = mutableListOf<ParticleSpec>()

            repeat(size) {
                particleSpecs.add(
                    requireNotNull(parcel.readParticleSpec()) {
                        "No ParticleSpec found in list position $it of parcel when reading Plan"
                    }
                )
            }

            return ParcelablePlan(Plan(particleSpecs))
        }

        override fun newArray(size: Int): Array<ParcelablePlan?> = arrayOfNulls(size)
    }
}

/** Wraps a [Plan] as a [ParcelablePlan]. */
fun Plan.toParcelable(): ParcelablePlan = ParcelablePlan(this)

/** Writes a [Plan] to a [Parcel]. */
fun Parcel.writePlan(Plan: Plan, flags: Int) =
    writeTypedObject(Plan.toParcelable(), flags)

/** Reads a [Plan] from a [Parcel]. */
fun Parcel.readPlan(): Plan? = readTypedObject(ParcelablePlan)?.actual
