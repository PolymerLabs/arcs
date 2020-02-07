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

import android.content.ComponentName
import android.os.Parcel
import android.os.Parcelable
import arcs.core.host.ParticleIdentifier

/** [Parcelable] variant of [ParticleIdentifier]. */
data class ParcelableParticleIdentifier(
    override val actual: ParticleIdentifier
) : ActualParcelable<ParticleIdentifier> {
    override fun writeToParcel(parcel: Parcel, flags: Int) = parcel.writeString(actual.id)

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableParticleIdentifier> {
        override fun createFromParcel(parcel: Parcel): ParcelableParticleIdentifier {
            val id = requireNotNull(parcel.readString()) {
              "No id found for ParcelableParticleIdentifier"
            }
            return ParcelableParticleIdentifier(ParticleIdentifier(id))
        }

        override fun newArray(size: Int): Array<ParcelableParticleIdentifier?> = arrayOfNulls(size)
    }
}

/** Wraps a [ParticleIdentifier] as a [ParcelableParticleIdentifier]. */
fun ParticleIdentifier.toParcelable(): ParcelableParticleIdentifier =
    ParcelableParticleIdentifier(this)

/** Writes a [ParticleIdentifier] to a [Parcel]. */
fun Parcel.writeParticleIdentifier(ParticleIdentifier: ParticleIdentifier, flags: Int) =
    writeTypedObject(ParticleIdentifier.toParcelable(), flags)

/** Reads a [ParticleIdentifier] from a [Parcel]. */
fun Parcel.readParticleIdentifier(): ParticleIdentifier? =
    readTypedObject(ParcelableParticleIdentifier)?.actual

fun ComponentName.toParticleIdentifier() =
    ParticleIdentifier(this.packageName + '.' + this.className)
