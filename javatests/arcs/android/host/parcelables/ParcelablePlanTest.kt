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
import arcs.core.data.Annotation
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
import kotlin.test.assertFailsWith

/** Tests for [ParcelablePlan]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelablePlanTest {

  private val personSchema = Schema(
    setOf(SchemaName("Person")),
    SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
    "42"
  )

  private val personType = EntityType(personSchema)

  @Before
  fun setup() {
    StorageKeyParser.reset(VolatileStorageKey)
  }

  @Test
  fun plan_parcelableRoundTrip_works() {
    val plan = testPlan()

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(plan.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelablePlan.CREATOR))
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(plan)
  }

  @Test
  fun writePlan_parcelableRoundTrip_works() {
    val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    val handle = Plan.Handle(storageKey, personType, listOf(Annotation.createTtl("2days")))
    val handleConnection = Plan.HandleConnection(handle, HandleMode.ReadWrite, personType)
    val particle = Plan.Particle(
      "Foobar",
      "foo.bar.Foobar",
      mapOf("foo" to handleConnection)
    )
    val plan = Plan(
      listOf(particle),
      listOf(handle),
      listOf(Annotation.createArcId("myArc"))
    )

    var parcel = Parcel.obtain()
    parcel.writePlan(plan, 0)
    parcel.setDataPosition(0)
    var recovered = parcel.readPlan()
    assertThat(recovered).isEqualTo(plan)
  }

  @Test
  fun array_parcelableRoundTrip_works() {
    val plan = testPlan().toParcelable()
    val arr = arrayOf(plan, plan)
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelablePlan.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(2)
    assertThat(unmarshalled?.get(0)?.actual).isEqualTo(plan.actual)
  }

  @Test
  fun handle_malformedParcelTruncated_fails() {
    val malformedParcel = Parcel.obtain().apply {
      writeInt(1) // Says value to come is non-empty.
      writeInt(6) // particle count
    }

    malformedParcel.setDataPosition(0)
    assertFailsWith<IllegalArgumentException>("missing particles") {
      malformedParcel.readTypedObject(requireNotNull(ParcelablePlan))
    }
  }

  private fun testPlan(): Plan {
    val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    val handle = Plan.Handle(storageKey, personType, listOf(Annotation.createTtl("2days")))
    val handleConnection = Plan.HandleConnection(handle, HandleMode.ReadWrite, personType)
    val handleConnection2 = Plan.HandleConnection(handle, HandleMode.ReadWrite, personType)
    val particle = Plan.Particle(
      "Foobar",
      "foo.bar.Foobar",
      mapOf("foo" to handleConnection)
    )

    val particle2 = Plan.Particle(
      "Foobar2",
      "foo.bar.Foobar2",
      mapOf("foo" to handleConnection2)
    )

    return Plan(
      listOf(particle, particle2),
      listOf(handle),
      listOf(Annotation.createArcId("myArc"))
    )
  }
}
