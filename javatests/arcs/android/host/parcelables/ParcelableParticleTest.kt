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

        val particle = Plan.Particle("Foobar", "foo.bar.Foobar", mapOf("foo" to connection))

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(particle.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelableParticle.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(particle)
    }
}
