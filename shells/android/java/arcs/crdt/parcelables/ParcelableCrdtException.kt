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

package arcs.crdt.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.core.crdt.CrdtException

/** [Parcelable] wrapper for a [CrdtException]. */
class ParcelableCrdtException(
    val message: String? = null,
    val stackTrace: Array<String> = emptyArray()
) : Parcelable {
    constructor(e: CrdtException) : this(e.message, e.stackTrace.toStrings())

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeValue(message)
        parcel.writeInt(stackTrace.size)
        parcel.writeStringArray(stackTrace)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableCrdtException> {
        override fun createFromParcel(parcel: Parcel): ParcelableCrdtException {
            val message = parcel.readValue(String::class.java.classLoader) as? String
            val stackTraceSize = parcel.readInt()
            val stackTrace = Array(stackTraceSize) { "" }.also { parcel.readStringArray(it) }
            return ParcelableCrdtException(message, stackTrace)
        }

        override fun newArray(size: Int): Array<ParcelableCrdtException?> = arrayOfNulls(size)
    }
}

/** Converts a [CrdtException] into a [ParcelableCrdtException]. */
fun CrdtException.toParcelable(): ParcelableCrdtException = ParcelableCrdtException(this)

internal fun Array<StackTraceElement>.toStrings(): Array<String> =
    Array(this.size) { index -> this[index].toString() }
