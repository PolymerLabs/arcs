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
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.crdt.readModelData
import arcs.android.crdt.writeModelData
import arcs.android.type.readType
import arcs.android.type.writeType
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.StorageMode
import arcs.core.storage.StoreOptions

/** [Parcelable] variant for [StoreOptions]. */
data class ParcelableStoreOptions(
    val actual: StoreOptions<out CrdtData, out CrdtOperation, out Any?>,
    val crdtType: ParcelableCrdtType
) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(crdtType.ordinal)
        parcel.writeString(actual.storageKey.toString())
        parcel.writeInt(actual.existenceCriteria.ordinal)
        parcel.writeType(actual.type, flags)
        parcel.writeInt(actual.mode.ordinal)
        // Skip StoreOptions.baseStore.
        parcel.writeString(actual.versionToken)
        parcel.writeModelData(actual.model, flags)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableStoreOptions> {
        override fun createFromParcel(parcel: Parcel): ParcelableStoreOptions {
            val crdtType = ParcelableCrdtType.values()[parcel.readInt()]
            val storageKey = StorageKeyParser.parse(requireNotNull(parcel.readString()))
            val existenceCriteria = ExistenceCriteria.values()[parcel.readInt()]
            val type = requireNotNull(parcel.readType()) { "Could not extract Type from Parcel" }
            val mode = StorageMode.values()[parcel.readInt()]
            val versionToken = parcel.readString()
            val modelData = parcel.readModelData(crdtType)

            return ParcelableStoreOptions(
                StoreOptions(
                    storageKey = storageKey,
                    existenceCriteria = existenceCriteria,
                    type = type,
                    mode = mode,
                    baseStore = null, // Skip baseStore.
                    versionToken = versionToken,
                    model = modelData
                ),
                crdtType
            )
        }

        override fun newArray(size: Int): Array<ParcelableStoreOptions?> = arrayOfNulls(size)
    }
}

/**
 * Wraps the [StoreOptions] in a [ParcelableStoreOptions], using the [ParcelableCrdtType] as a hint.
 */
fun StoreOptions<out CrdtData, out CrdtOperation, out Any?>.toParcelable(
    crdtType: ParcelableCrdtType
): ParcelableStoreOptions = ParcelableStoreOptions(this, crdtType)

/** Writes [StoreOptions] to the [Parcel]. */
fun Parcel.writeStoreOptions(
    storeOptions: StoreOptions<out CrdtData, out CrdtOperation, out Any?>,
    representingCrdtType: ParcelableCrdtType,
    flags: Int
) = writeTypedObject(storeOptions.toParcelable(representingCrdtType), flags)

/** Reads [StoreOptions] from the [Parcel]. */
fun Parcel.readStoreOptions(): StoreOptions<out CrdtData, out CrdtOperation, out Any?>? =
    readTypedObject(ParcelableStoreOptions)?.actual
