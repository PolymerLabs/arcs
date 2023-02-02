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
import arcs.core.data.Annotation
import arcs.core.data.EntityType
import arcs.core.data.FieldType.Companion.Number
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

  private val addressSchema = Schema(
    setOf(SchemaName("Address")),
    SchemaFields(mapOf("number" to Number, "street" to Text), emptyMap()),
    "4567"
  )

  private val productsSchema = Schema(
    setOf(SchemaName("Products")),
    SchemaFields(mapOf("name" to Text), mapOf("ratings" to Number)),
    "678"
  )

  @Before
  fun setup() {
    StorageKeyManager.GLOBAL_INSTANCE.reset(VolatileStorageKey)
  }

  @Test
  fun handleNoAnnotations_parcelableRoundTrip_works() {
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

    val remarshalled = with(Parcel.obtain()) {
      writeTypedObject(unmarshalled, 0)
      marshall()
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(handle)
    assertThat(remarshalled).isEqualTo(marshalled)
  }

  @Test
  fun handleOneAnnotation_parcelableRoundTrip_works() {
    val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    val addressType = EntityType(addressSchema)
    val annotation = Annotation("test2")
    val handle = Handle(storageKey, addressType, listOf(annotation))

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(handle.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableHandle.CREATOR))
    }

    val remarshalled = with(Parcel.obtain()) {
      writeTypedObject(unmarshalled, 0)
      marshall()
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(handle)
    assertThat(remarshalled).isEqualTo(marshalled)
  }

  @Test
  fun handleMultipleAnnotations_parcelableRoundTrip_works() {
    val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    val productsType = EntityType(productsSchema)
    val annotation1 = Annotation("test1")
    val annotation2 = Annotation("test2")
    val handle = Handle(storageKey, productsType, listOf(annotation1, annotation2))

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(handle.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableHandle.CREATOR))
    }

    val remarshalled = with(Parcel.obtain()) {
      writeTypedObject(unmarshalled, 0)
      marshall()
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(handle)
    assertThat(remarshalled).isEqualTo(marshalled)
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
  fun emptyArray_parcelableRoundTrip_works() {
    val arr = arrayOf<ParcelableHandle>()
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelableHandle.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(0)
  }

  @Test
  fun newArray_directCall_works() {
    val arr0 = ParcelableHandle.CREATOR.newArray(0)
    val arr1 = ParcelableHandle.CREATOR.newArray(1)
    val arr3 = ParcelableHandle.CREATOR.newArray(3)

    assertThat(arr0.size).isEqualTo(0)
    assertThat(arr1.size).isEqualTo(1)
    assertThat(arr3.size).isEqualTo(3)
    assertThat(arr1.get(0)).isEqualTo(null)
    assertThat(arr3.get(2)).isEqualTo(null)
  }

  @Test
  fun readHandle_emptyParcel_isNull() {
    val emptyParcel = Parcel.obtain()

    emptyParcel.setDataPosition(0)
    val unmarshalled = emptyParcel.readTypedObject(requireNotNull(ParcelableHandle))
    assertThat(unmarshalled).isEqualTo(null)
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
