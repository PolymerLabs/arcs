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
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.HandleConnectionSpec
import arcs.core.host.HandleSpec
import arcs.core.host.ParticleSpec
import arcs.core.host.PlanPartition
import arcs.core.storage.driver.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelablePlanPartition]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelablePlanPartitionTest {

    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(setOf("name"), emptySet()),
        SchemaDescription()
    )

    @Test
    fun planPartition_parcelableRoundTrip_works() {
        val particleSpec = ParticleSpec("Foobar", "foo.bar.Foobar")
        val particleSpec2 = ParticleSpec("Foobar2", "foo.bar.Foobar2")

        val handleSpec = HandleSpec(
            "foo", "bar", VolatileStorageKey(ArcId.newForTest("foo"), "bar"),
            mutableSetOf("volatile"),
            personSchema
        )

        val handleConnectionSpec = HandleConnectionSpec("blah", handleSpec, particleSpec)
        val handleConnectionSpec2 = HandleConnectionSpec("blah2", handleSpec, particleSpec2)

        val planPartition =
            PlanPartition("arcId", "arcHost", listOf(handleConnectionSpec, handleConnectionSpec2))

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
