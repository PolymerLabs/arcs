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

import android.content.ComponentName
import android.os.Parcel
import android.os.Parcelable
import arcs.core.host.ParticleIdentifier

/** [Parcelable] variant of [ParticleIdentifier]. */
data class ParcelableParticleIdentifier(val actual: ParticleIdentifier) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) =
        actual.toComponentName().writeToParcel(parcel, flags)

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableParticleIdentifier> {
        override fun createFromParcel(parcel: Parcel): ParcelableParticleIdentifier {

            val componentName = ComponentName(parcel)

            return ParcelableParticleIdentifier(componentName.toParticleIdentifier())
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
    arcs.core.host.ParticleIdentifier(this.packageName, this.className)

fun ParticleIdentifier.toComponentName() = ComponentName(this.pkg, this.cls)
