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

package arcs.android.storage

import android.os.Parcel
import android.os.Parcelable
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.type.readType
import arcs.android.type.writeType
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StoreOptions

/** [Parcelable] variant for [StoreOptions]. */
data class ParcelableStoreOptions(
  val actual: StoreOptions,
  val crdtType: ParcelableCrdtType
) : Parcelable {
  override fun writeToParcel(parcel: Parcel, flags: Int) {
    parcel.writeInt(crdtType.ordinal)
    parcel.writeString(actual.storageKey.toString())
    parcel.writeType(actual.type, flags)
    parcel.writeString(actual.versionToken)
    parcel.writeInt(if (actual.writeOnly) 1 else 0)
  }

  override fun describeContents(): Int = 0

  companion object CREATOR : Parcelable.Creator<ParcelableStoreOptions> {
    override fun createFromParcel(parcel: Parcel): ParcelableStoreOptions {
      val crdtType = ParcelableCrdtType.values()[parcel.readInt()]
      val storageKey = StorageKeyManager.GLOBAL_INSTANCE.parse(requireNotNull(parcel.readString()))
      val type = requireNotNull(parcel.readType()) { "Could not extract Type from Parcel" }
      val versionToken = parcel.readString()
      val writeOnly = parcel.readInt() == 1

      return ParcelableStoreOptions(
        StoreOptions(
          storageKey = storageKey,
          type = type,
          versionToken = versionToken,
          writeOnly = writeOnly
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
fun StoreOptions.toParcelable(
  crdtType: ParcelableCrdtType
): ParcelableStoreOptions = ParcelableStoreOptions(this, crdtType)

/** Writes [StoreOptions] to the [Parcel]. */
fun Parcel.writeStoreOptions(
  storeOptions: StoreOptions,
  representingCrdtType: ParcelableCrdtType,
  flags: Int
) = writeTypedObject(storeOptions.toParcelable(representingCrdtType), flags)

/** Reads [StoreOptions] from the [Parcel]. */
fun Parcel.readStoreOptions(): StoreOptions? =
  readTypedObject(ParcelableStoreOptions)?.actual

/** Writes [StoreOptions] to a [Parcel] and return the raw bytes of the [Parcel]. */
fun StoreOptions.toParcelByteArray(crdtType: ParcelableCrdtType): ByteArray {
  val storeOptions = this
  return with(Parcel.obtain()) {
    writeStoreOptions(storeOptions, crdtType, 0)
    marshall()
  }
}

/** Unmarshal [ParcelableStoreOptions] and reads the [StoreOptions] from the resulting [Parcel]. */
fun ByteArray.readStoreOptions(): StoreOptions {
  val parcelableStoreOptions = this
  return with(Parcel.obtain()) {
    unmarshall(parcelableStoreOptions, 0, parcelableStoreOptions.size)
    setDataPosition(0)
    checkNotNull(readStoreOptions()) { "StoreOptions read from Parcel were null." }
  }
}
