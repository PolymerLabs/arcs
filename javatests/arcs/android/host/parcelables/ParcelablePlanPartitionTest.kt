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
import arcs.core.common.toArcId
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.HandleMode
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelablePlanPartition]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelablePlanPartitionTest {

    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        "42"
    )

    @Test
    fun PlanPartition_parcelableRoundTrip_works() {
        val handleConnection = Plan.HandleConnection(
            VolatileStorageKey(ArcId.newForTest("foo"), "bar"),
            HandleMode.ReadWrite,
            EntityType(personSchema)
        )

        val handleConnection2 = Plan.HandleConnection(
            VolatileStorageKey(ArcId.newForTest("foo"), "bar2"),
            HandleMode.ReadWrite,
            EntityType(personSchema)
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

        val planPartition = Plan.Partition("arcId".toArcId(), "arcHost", listOf(particle, particle2))


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
