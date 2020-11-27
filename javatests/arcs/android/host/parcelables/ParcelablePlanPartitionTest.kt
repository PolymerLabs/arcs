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
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelablePlanPartition]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelablePlanPartitionTest {

  @Before
  fun setup() {
    StorageKeyParser.reset(VolatileStorageKey)
  }

  @Test
  fun describeContents_returnsZero() {
    val planPartition = Plan.Partition("arcId", "arcHost", listOf(PARTICLE_1, PARTICLE_2))

    assertThat(planPartition.toParcelable().describeContents()).isEqualTo(0)
  }

  @Test
  fun planPartition_parcelableRoundTrip_works() {
    val planPartition = Plan.Partition("arcId", "arcHost", listOf(PARTICLE_1, PARTICLE_2))

    val marshalled = planPartition.marshall()
    val unmarshalled = marshalled.unmarshall()

    assertThat(unmarshalled).isEqualTo(planPartition)
  }

  @Test
  fun planPartition_parcelableRoundTrip_ofArray_works() {
    val planPartition1 = Plan.Partition("arcId1", "arcHost", listOf(PARTICLE_2))
    val planPartition2 = Plan.Partition("arcId2", "arcHost", listOf(PARTICLE_1))

    val marshalled = with(Parcel.obtain()) {
      writeParcelableArray(arrayOf(planPartition1.toParcelable(), planPartition2.toParcelable()), 0)
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readParcelableArray(ParcelablePlanPartition::class.java.classLoader)
    }

    assertThat(unmarshalled).asList()
      .containsExactlyElementsIn(
        listOf(planPartition1.toParcelable(), planPartition2.toParcelable())
      )
  }

  @Test
  fun planPartition_parcelableRoundTrip_works_withNoParticles() {
    val planPartition = Plan.Partition("arcId", "arcHost", emptyList())

    val marshalled = planPartition.marshall()
    val unmarshalled = marshalled.unmarshall()

    assertThat(unmarshalled).isEqualTo(planPartition)
  }

  @Test
  fun planPartition_parcelableRoundTrip_works_withMinimalData() {
    val planPartition = Plan.Partition("", "", emptyList())

    val marshalled = planPartition.marshall()
    val unmarshalled = marshalled.unmarshall()

    assertThat(unmarshalled).isEqualTo(planPartition)
  }

  @Test
  fun planPartitionArray_parcelableRoundTrip_works_withMinimalData() {
    val planPartition = Plan.Partition("", "", emptyList()).toParcelable()
    val arr = arrayOf(planPartition, planPartition)
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelablePlanPartition.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(2)
    assertThat(unmarshalled?.get(0)?.actual).isEqualTo(planPartition.actual)
  }

  @Test
  fun createFromParcel_failsWhenNoArcId_available() {
    val emptyParcel = Parcel.obtain().apply { writeInt(0) /* empty values.. */ }
    val parcelWithIntAtStart =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeInt(42)
      }

    try {
      emptyParcel.marshall().unmarshall()
    } catch (e: IllegalArgumentException) {
      assertThat(e).hasMessageThat().contains("No ArcId found in Parcel")
    }

    try {
      parcelWithIntAtStart.marshall().unmarshall()
    } catch (e: IllegalArgumentException) {
      assertThat(e).hasMessageThat().contains("No ArcId found in Parcel")
    }
  }

  @Test
  fun createFromParcel_failsWhenNoArcHost_available() {
    val onlyArcId =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString("arcId")
      }
    val invalidArcHost =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString("arcId")
        writeInt(42)
      }

    try {
      onlyArcId.marshall().unmarshall()
    } catch (e: IllegalArgumentException) {
      assertThat(e).hasMessageThat().contains("No ArcHost found in Parcel")
    }

    try {
      invalidArcHost.marshall().unmarshall()
    } catch (e: IllegalArgumentException) {
      assertThat(e).hasMessageThat().contains("No ArcHost found in Parcel")
    }
  }

  @Test
  fun createFromParcel_failsWhenNoParticleListSize_available() {
    val missingSize =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString("arcId")
        writeString("arcHost")
      }
    val itemInSizePositionNotInt =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString("arcId")
        writeString("arcHost")
        writeString("not a number")
      }

    try {
      missingSize.marshall().unmarshall()
    } catch (e: IllegalArgumentException) {
      assertThat(e).hasMessageThat().contains("No size of ParticleSpecs found in Parcel")
    }

    try {
      itemInSizePositionNotInt.marshall().unmarshall()
    } catch (e: IllegalArgumentException) {
      assertThat(e).hasMessageThat().contains("No size of ParticleSpecs found in Parcel")
    }
  }

  @Test
  fun createFromParcel_failsWhenNotEnoughParticles() {
    val missingFirst =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString("arcId")
        writeString("arcHost")
        writeInt(1)
        // no particle
      }
    val missingSecond =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString("arcId")
        writeString("arcHost")
        writeInt(2)
        writeTypedObject(PARTICLE_1.toParcelable(), 0)
      }

    try {
      missingFirst.marshall().unmarshall()
    } catch (e: IllegalArgumentException) {
      assertThat(e).hasMessageThat()
        .contains("Expected to find 1 Particle(s), but Particle at position 0 could not be found")
    }

    try {
      missingSecond.marshall().unmarshall()
    } catch (e: IllegalArgumentException) {
      assertThat(e).hasMessageThat()
        .contains("Expected to find 2 Particle(s), but Particle at position 1 could not be found")
    }
  }

  private fun Plan.Partition.marshall(): ByteArray {
    return with(Parcel.obtain()) {
      writePlanPartition(this@marshall, 0)
      marshall()
    }
  }

  private fun ByteArray.unmarshall(): Plan.Partition? {
    return with(Parcel.obtain()) {
      unmarshall(this@unmarshall, 0, this@unmarshall.size)
      setDataPosition(0)
      readPlanPartition()
    }
  }

  companion object {
    private val personSchema = Schema(
      setOf(SchemaName("Person")),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "42"
    )
    private val personType = EntityType(personSchema)
    private val volatileStorageKey1 = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    private val volatileStorageKey2 = VolatileStorageKey(ArcId.newForTest("foo"), "bar2")

    private val PARTICLE_1 = Plan.Particle(
      particleName = "Foobar",
      location = "foo.bar.Foobar",
      handles = mapOf(
        "foo1" to Plan.HandleConnection(
          Plan.Handle(volatileStorageKey1, personType, emptyList()),
          HandleMode.ReadWrite,
          personType
        )
      )
    )
    private val PARTICLE_2 = Plan.Particle(
      particleName = "Foobar2",
      location = "foo.bar.Foobar2",
      handles = mapOf(
        "foo2" to Plan.HandleConnection(
          Plan.Handle(volatileStorageKey2, personType, emptyList()),
          HandleMode.ReadWrite,
          personType
        )
      )
    )
  }
}
