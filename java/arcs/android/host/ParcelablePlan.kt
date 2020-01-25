/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.host

import android.os.Parcel
import android.os.Parcelable
import arcs.core.host.HandleConnectionSpec
import arcs.core.host.Plan

/** [Parcelable] variant of [Plan]. */
data class ParcelablePlan(val actual: Plan) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(actual.handleConnectionSpecs.size)
        actual.handleConnectionSpecs.forEach {
            parcel.writeHandleConnectionSpec(it, 0)
        }
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelablePlan> {
        override fun createFromParcel(parcel: Parcel): ParcelablePlan {

            val size = requireNotNull(parcel.readInt()) {
                "No size of handleConnectionSpecs found in Parcel"
            }

            val handleConnectionSpecs = mutableListOf<HandleConnectionSpec>()

            repeat(size) {
                handleConnectionSpecs.add(requireNotNull(parcel.readHandleConnectionSpec()) {
                    "No HandleConnectionSpec found in parcel when reading Plan"
                })
            }

            return ParcelablePlan(Plan(handleConnectionSpecs))
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
