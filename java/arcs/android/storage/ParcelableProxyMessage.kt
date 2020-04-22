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

package arcs.android.storage

import android.os.Parcel
import android.os.Parcelable
import arcs.android.util.requireProto
import arcs.android.util.writeProto
import arcs.core.storage.ProxyMessage

/** Defines parcelable variants of the [ProxyMessage]s. */
// TODO(b/151449060): Delete this class, and convert all usages to ProxyMessageProto.
class ParcelableProxyMessage(val actual: ProxyMessage<*, *, *>) : Parcelable {

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeProto(actual.toProto())
    }

    override fun describeContents(): Int = 0

    companion object {

        @JvmField
        val CREATOR = object : Parcelable.Creator<ParcelableProxyMessage> {
            override fun createFromParcel(parcel: Parcel): ParcelableProxyMessage {
                return ParcelableProxyMessage(
                    parcel.requireProto(ProxyMessageProto.getDefaultInstance()).toProxyMessage()
                )
            }

            override fun newArray(size: Int): Array<ParcelableProxyMessage?> = arrayOfNulls(size)
        }
    }
}

/** Converts the [ProxyMessage] into its [Parcelable] variant. */
fun ProxyMessage<*, *, *>.toParcelable() = ParcelableProxyMessage(this)
