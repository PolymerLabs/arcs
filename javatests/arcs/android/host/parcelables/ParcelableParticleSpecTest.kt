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
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.driver.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableParticleSpec]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableParticleSpecTest {

    @Test
    fun particleSpec_parcelableRoundTrip_works() {
        val personSchema = Schema(
            listOf(SchemaName("Person")),
            SchemaFields(mapOf("name" to Text), emptyMap()),
            "42"
        )

        val connectionSpec = HandleConnectionSpec(
            VolatileStorageKey(ArcId.newForTest("foo"), "bar"),
            EntityType(personSchema)
        )

        val spec = ParticleSpec("Foobar", "foo.bar.Foobar", mapOf("foo" to connectionSpec))

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(spec.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelableParticleSpec.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(spec)
    }
}
