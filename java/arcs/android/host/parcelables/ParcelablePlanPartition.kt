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

/** [Parcelable] variant of [Plan.Partition]. */
data class ParcelablePlanPartition(
  override val actual: Plan.Partition
) : ActualParcelable<Plan.Partition> {
  override fun writeToParcel(parcel: Parcel, flags: Int) {
    parcel.writeString(actual.arcId)
    parcel.writeString(actual.arcHost)
    parcel.writeInt(actual.particles.size)
    actual.particles.forEach {
      parcel.writeParticle(it, 0)
    }
  }

  override fun describeContents(): Int = 0

  companion object CREATOR : Parcelable.Creator<ParcelablePlanPartition> {
    override fun createFromParcel(parcel: Parcel): ParcelablePlanPartition {
      // We use try/catch and catch any RuntimeException here so that we don't accidentally log
      // **values** when an error happens.

      val arcId = try {
        requireNotNull(parcel.readString())
      } catch (e: RuntimeException) {
        throw IllegalArgumentException("No ArcId found in Parcel")
      }
      val arcHost = try {
        requireNotNull(parcel.readString())
      } catch (e: RuntimeException) {
        throw IllegalArgumentException("No ArcHost found in Parcel")
      }
      val size = try {
        requireNotNull(parcel.readInt())
      } catch (e: RuntimeException) {
        throw IllegalArgumentException("No size of ParticleSpecs found in Parcel")
      }

      val particles = MutableList(size) { position ->
        try {
          requireNotNull(parcel.readParticle())
        } catch (e: RuntimeException) {
          throw IllegalArgumentException(
            "Expected to find $size Particle(s), but Particle at position $position " +
              "could not be found"
          )
        }
      }

      return ParcelablePlanPartition(Plan.Partition(arcId, arcHost, particles))
    }

    override fun newArray(size: Int): Array<ParcelablePlanPartition?> = arrayOfNulls(size)
  }
}

/** Wraps a [Plan.Partition] as a [ParcelablePlanPartition]. */
fun Plan.Partition.toParcelable(): ParcelablePlanPartition = ParcelablePlanPartition(this)

/** Writes a [Plan.Partition] to a [Parcel]. */
fun Parcel.writePlanPartition(planPartition: Plan.Partition, flags: Int) =
  writeTypedObject(planPartition.toParcelable(), flags)

/** Reads a [Plan.Partition] from a [Parcel]. */
fun Parcel.readPlanPartition(): Plan.Partition? = readTypedObject(ParcelablePlanPartition)?.actual
