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
import arcs.core.data.HandleMode
import arcs.core.data.Plan.Handle
import arcs.core.data.Plan.HandleConnection
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.expression.asExpr
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import java.lang.IllegalArgumentException
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableHandleConnection]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableHandleConnectionTest {

  private val personSchema = Schema(
    setOf(SchemaName("Person")),
    SchemaFields(mapOf("name" to Text), emptyMap()),
    "42"
  )
  private val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
  private val personType = EntityType(personSchema)

  @Before
  fun setup() {
    StorageKeyManager.GLOBAL_INSTANCE.reset(VolatileStorageKey)
  }

  @Test
  fun handleConnection_parcelableRoundTrip_works() {
    val handleConnection = HandleConnection(
      Handle(storageKey, personType, emptyList()),
      HandleMode.ReadWrite,
      personType,
      emptyList(),
      true.asExpr()
    )

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(handleConnection.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableHandleConnection.CREATOR))
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(handleConnection)
  }

  @Test
  fun handleConnection_parcelableRoundTrip_works_nullExpression() {
    val handleConnection = HandleConnection(
      Handle(storageKey, personType, emptyList()),
      HandleMode.ReadWrite,
      personType
    )

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(handleConnection.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableHandleConnection.CREATOR))
    }

    assertThat(unmarshalled?.actual).isEqualTo(handleConnection)
  }

  @Test
  fun writeHandleConnectionSpec_parcelableRoundTrip_works() {
    val handleConnection = HandleConnection(
      Handle(storageKey, personType, emptyList()),
      HandleMode.ReadWrite,
      personType,
      emptyList(),
      true.asExpr()
    )
    var parcel = Parcel.obtain()
    parcel.writeHandleConnectionSpec(handleConnection, 0)
    parcel.setDataPosition(0)
    val recovered = parcel.readHandleConnectionSpec()
    assertThat(recovered).isEqualTo(handleConnection)
  }

  @Test
  fun array_parcelableRoundTrip_works() {
    val handleConnection = HandleConnection(
      Handle(storageKey, personType, emptyList()),
      HandleMode.ReadWrite,
      personType,
      emptyList(),
      true.asExpr()
    ).toParcelable()
    val arr = arrayOf(handleConnection, handleConnection)

    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelableHandleConnection.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(2)
    assertThat(unmarshalled?.get(0)?.actual).isEqualTo(handleConnection.actual)
  }

  @Test
  fun handleConnection_malformedParcelNoHandle_fails() {
    val parcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.

      // Invalid handle contents
      writeString(null) // handle
      writeType(personType, 0) // type
      writeInt(0) // handleMode
      writeInt(0) // annotation count

      writeType(personType, 0)
      writeInt(HandleMode.ReadWrite.ordinal)
      writeString("") // expression
    }

    parcel.setDataPosition(0)
    assertFailsWith<RuntimeException>("malformed handle") {
      parcel.readTypedObject(requireNotNull(ParcelableHandleConnection))
    }
  }
  @Test
  fun handleConnection_malformedParcelNoType_fails() {
    val handle = Handle(storageKey, personType, emptyList())
    val parcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeHandle(handle, 0)
      writeInt(9999) // invalid handle type ordinal
      writeInt(HandleMode.ReadWrite.ordinal)
      writeString("") // expression
    }

    parcel.setDataPosition(0)
    assertFailsWith<RuntimeException>("malformed type") {
      parcel.readTypedObject(requireNotNull(ParcelableHandleConnection))
    }
  }
  @Test
  fun handleConnection_malformedParcelInvalidHandleMode_fails() {
    val handle = Handle(storageKey, personType, emptyList())
    val parcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeHandle(handle, 0)
      writeType(personType, 0)
      writeInt(999)
      writeString("") // expression
    }

    parcel.setDataPosition(0)
    assertFailsWith<IllegalArgumentException>("invalid handle mode") {
      parcel.readTypedObject(requireNotNull(ParcelableHandleConnection))
    }
  }
  @Test
  fun handleConnection_malformedParcelInvalidExpression_fails() {
    val handle = Handle(storageKey, personType, emptyList())
    val parcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeHandle(handle, 0)
      writeType(personType, 0)
      writeInt(HandleMode.ReadWrite.ordinal)
      writeString("not-an-expression") // expression
    }

    parcel.setDataPosition(0)
    assertFailsWith<IllegalArgumentException>("invalid expression") {
      parcel.readTypedObject(requireNotNull(ParcelableHandleConnection))
    }
  }
}
