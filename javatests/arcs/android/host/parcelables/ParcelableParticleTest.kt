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
import arcs.core.common.ArcId
import arcs.core.data.EntityType
import arcs.core.data.FieldType.Companion.Text
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableParticle]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableParticleTest {
  @Before
  fun setup() {
    StorageKeyParser.reset(
      ReferenceModeStorageKey,
      RamDiskStorageKey,
      VolatileStorageKey
    )
  }

  @Test
  fun particle_parcelableRoundTrip_works() {
    val particle = testParticle()

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(particle.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableParticle.CREATOR))
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(particle)
  }

  @Test
  fun array_parcelableRoundTrip_works() {
    val particle = testParticle().toParcelable()
    val arr = arrayOf(particle, particle)
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelableParticle.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(2)
    assertThat(unmarshalled?.get(0)?.actual).isEqualTo(particle.actual)
  }

  @Test
  fun handle_malformedParcelMissingName_fails() {
    val malformedParcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeString(null) // name
      writeString("location") // location
      writeMap(null) // handles
    }

    malformedParcel.setDataPosition(0)
    assertFailsWith<IllegalArgumentException>("missing name") {
      malformedParcel.readTypedObject(requireNotNull(ParcelableParticle))
    }
  }

  @Test
  fun handle_malformedParcelMissingLocation_fails() {
    val malformedParcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeString("name") // name
      writeString(null) // location
      writeMap(null) // handles
    }

    malformedParcel.setDataPosition(0)
    assertFailsWith<IllegalArgumentException>("missing location") {
      malformedParcel.readTypedObject(requireNotNull(ParcelableParticle))
    }
  }

  private fun testParticle(): Plan.Particle {
    val personSchema = Schema(
      setOf(SchemaName("Person")),
      SchemaFields(mapOf("name" to Text), emptyMap()),
      "42"
    )

    val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    val personType = EntityType(personSchema)
    val connection = Plan.HandleConnection(
      Plan.Handle(storageKey, personType, emptyList()),
      HandleMode.ReadWrite,
      personType
    )

    return Plan.Particle("Foobar", "foo.bar.Foobar", mapOf("foo" to connection))
  }
}
