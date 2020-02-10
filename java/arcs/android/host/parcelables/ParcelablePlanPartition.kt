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
import arcs.core.data.PlanPartition

/** [Parcelable] variant of [PlanPartition]. */
data class ParcelablePlanPartition(
    override val actual: PlanPartition
) : ActualParcelable<PlanPartition> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.arcId)
        parcel.writeString(actual.arcHost)
        parcel.writeInt(actual.particles.size)
        actual.particles.forEach {
            parcel.writeParticleSpec(it, 0)
        }
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelablePlanPartition> {
        override fun createFromParcel(parcel: Parcel): ParcelablePlanPartition {
            val arcId = requireNotNull(parcel.readString()) {
                "No ArcId found in Parcel"
            }
            val arcHost = requireNotNull(parcel.readString()) {
                "No ArcHost found in Parcel"
            }
            val size = requireNotNull(parcel.readInt()) {
                "No size of ParticleSpecs found in Parcel"
            }
            val particleSpecs = mutableListOf<ParticleSpec>()

            repeat(size) {
                particleSpecs.add(
                    requireNotNull(parcel.readParticleSpec()) {
                        "No ParcelSpecs found in parcel when reading PlanPartition"
                    }
                )
            }

            return ParcelablePlanPartition(PlanPartition(arcId, arcHost, particleSpecs))
        }

        override fun newArray(size: Int): Array<ParcelablePlanPartition?> = arrayOfNulls(size)
    }
}

/** Wraps a [PlanPartition] as a [ParcelablePlanPartition]. */
fun PlanPartition.toParcelable(): ParcelablePlanPartition = ParcelablePlanPartition(this)

/** Writes a [PlanPartition] to a [Parcel]. */
fun Parcel.writePlanPartition(planPartition: PlanPartition, flags: Int) =
    writeTypedObject(planPartition.toParcelable(), flags)

/** Reads a [PlanPartition] from a [Parcel]. */
fun Parcel.readPlanPartition(): PlanPartition? = readTypedObject(ParcelablePlanPartition)?.actual
