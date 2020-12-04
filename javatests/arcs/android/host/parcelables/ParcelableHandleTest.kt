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
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.type.writeType
import arcs.core.common.ArcId
import arcs.core.data.EntityType
import arcs.core.data.FieldType.Companion.Text
import arcs.core.data.Plan.Handle
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableHandle]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableHandleTest {

  private val personSchema = Schema(
    setOf(SchemaName("Person")),
    SchemaFields(mapOf("name" to Text), emptyMap()),
    "42"
  )

  @Before
  fun setup() {
    StorageKeyManager.GLOBAL_INSTANCE.reset(VolatileStorageKey)
  }

  @Test
  fun handle_parcelableRoundTrip_works() {
    val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    val personType = EntityType(personSchema)
    val handle = Handle(storageKey, personType, emptyList())

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(handle.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableHandle.CREATOR))
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(handle)
  }

  @Test
  fun array_parcelableRoundTrip_works() {
    val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    val personType = EntityType(personSchema)
    val handle = Handle(storageKey, personType, emptyList()).toParcelable()
    val arr = arrayOf(handle, handle)

    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelableHandle.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(2)
    assertThat(unmarshalled?.get(0)?.actual).isEqualTo(handle.actual)
  }

  @Test
  fun handle_malformedParcelNoStorageKey_fails() {
    val personType = EntityType(personSchema)
    val malformedParcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeString(null) // handle
      writeType(personType, 0) // type
      writeInt(0) // handleMode
      writeInt(0) // annotation count
    }

    malformedParcel.setDataPosition(0)
    assertFailsWith<RuntimeException>("missing storage key") {
      malformedParcel.readTypedObject(requireNotNull(ParcelableHandle))
    }
  }

  @Test
  fun handle_malformedParcelNoType_fails() {
    val malformedParcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeString("storage-key") // handle
      writeInt(9999) // invalid handle type ordinal
      writeInt(0) // handleMode
      writeInt(0) // annotation count
    }

    malformedParcel.setDataPosition(0)
    assertFailsWith<IllegalArgumentException>("invalid handle type ordinal") {
      malformedParcel.readTypedObject(requireNotNull(ParcelableHandle))
    }
  }

  @Test
  fun handle_malformedParcelInvalidHandleMode_fails() {
    val personType = EntityType(personSchema)
    val malformedParcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeString("storage-key") // handle
      writeType(personType, 0) // type
      writeInt(999) // handleMode
      writeInt(0) // annotation count
    }

    malformedParcel.setDataPosition(0)
    assertFailsWith<RuntimeException>("invalid handle mode") {
      malformedParcel.readTypedObject(requireNotNull(ParcelableHandle))
    }
  }
}
