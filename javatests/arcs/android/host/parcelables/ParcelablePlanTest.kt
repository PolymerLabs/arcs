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
import arcs.core.data.Schema
simport arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.Plan
import arcs.core.storage.driver.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelablePlan]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelablePlanTest {

    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        "42"
    )

    private val personType = EntityType(personSchema)

    @Test
    fun plan_parcelableRoundTrip_works() {
        val storageKey = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
        val handleConnectionSpec = HandleConnectionSpec(storageKey, personType)
        val handleConnectionSpec2 = HandleConnectionSpec(storageKey, personType)
        val particleSpec = ParticleSpec(
            "Foobar",
            "foo.bar.Foobar",
            mapOf("foo" to handleConnectionSpec)
        )

        val particleSpec2 = ParticleSpec(
            "Foobar2",
            "foo.bar.Foobar2",
             mapOf("foo" to handleConnectionSpec2)
        )

        val plan = Plan(listOf(particleSpec, particleSpec2))

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(plan.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelablePlan.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(plan)
    }
}
