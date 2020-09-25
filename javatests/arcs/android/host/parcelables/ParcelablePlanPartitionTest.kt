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

  private val personSchema = Schema(
    setOf(SchemaName("Person")),
    SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
    "42"
  )

  @Before
  fun setup() {
    StorageKeyParser.reset(VolatileStorageKey)
  }

  @Test
  fun PlanPartition_parcelableRoundTrip_works() {
    val barStorageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    val personType = EntityType(personSchema)
    val handleConnection = Plan.HandleConnection(
      Plan.Handle(barStorageKey, personType, emptyList()),
      HandleMode.ReadWrite,
      personType
    )

    var bar2StorageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar2")
    val handleConnection2 = Plan.HandleConnection(
      Plan.Handle(bar2StorageKey, personType, emptyList()),
      HandleMode.ReadWrite,
      personType
    )

    val particle = Plan.Particle(
      "Foobar",
      "foo.bar.Foobar",
      mapOf("foo1" to handleConnection)
    )
    val particle2 = Plan.Particle(
      "Foobar2",
      "foo.bar.Foobar2",
      mapOf("foo2" to handleConnection2)
    )

    val planPartition = Plan.Partition("arcId", "arcHost", listOf(particle, particle2))

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(planPartition.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelablePlanPartition.CREATOR))
    }

    assertThat(unmarshalled?.actual).isEqualTo(planPartition)
  }
}
