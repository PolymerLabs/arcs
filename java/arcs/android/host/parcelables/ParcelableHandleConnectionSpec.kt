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
import arcs.core.host.HandleConnectionSpec

/** [Parcelable] variant of [HandleConnectionSpec]. */
data class ParcelableHandleConnectionSpec(override val actual: HandleConnectionSpec) :
    ActualParcelable<HandleConnectionSpec> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.connectionName)
        parcel.writeHandleSpec(actual.handleSpec, 0)
        parcel.writeParticleSpec(actual.particleSpec, 0)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableHandleConnectionSpec> {
        override fun createFromParcel(parcel: Parcel): ParcelableHandleConnectionSpec {
            val connectionName = requireNotNull(parcel.readString()) {
                "No connectionName found in Parcel"
            }

            val handleSpec = requireNotNull(parcel.readHandleSpec()) {
                "No name found in Parcel"
            }

            val particleSpec = requireNotNull(parcel.readParticleSpec()) {
                "No storageKey found in Parcel"
            }

            return ParcelableHandleConnectionSpec(
                HandleConnectionSpec(
                    connectionName, handleSpec, particleSpec
                )
            )
        }

        override fun newArray(size: Int): Array<ParcelableHandleConnectionSpec?> =
            arrayOfNulls(size)
    }
}

/** Wraps a [HandleConnectionSpec] as a [ParcelableHandleConnectionSpec]. */
fun HandleConnectionSpec.toParcelable(): ParcelableHandleConnectionSpec =
    ParcelableHandleConnectionSpec(this)

/** Writes a [HandleConnectionSpec] to a [Parcel]. */
fun Parcel.writeHandleConnectionSpec(HandleConnectionSpec: HandleConnectionSpec, flags: Int) =
    writeTypedObject(HandleConnectionSpec.toParcelable(), flags)

/** Reads a [HandleConnectionSpec] from a [Parcel]. */
fun Parcel.readHandleConnectionSpec(): HandleConnectionSpec? =
    readTypedObject(ParcelableHandleConnectionSpec)?.actual
