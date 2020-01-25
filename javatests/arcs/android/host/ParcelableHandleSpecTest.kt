/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.host

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.common.ArcId
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.HandleSpec
import arcs.core.storage.driver.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableParticleSpec]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableHandleSpecTest {

    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(setOf("name"), emptySet()),
        SchemaDescription()
    )

    @Test
    fun handleSpec_parcelableRoundTrip_works() {
        val handleSpec = HandleSpec(
            "foo", "bar", VolatileStorageKey(ArcId.newForTest("foo"), "bar"),
            mutableSetOf("volatile"),
            personSchema
        )

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(handleSpec.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelableHandleSpec.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(handleSpec)
    }

    @Test
    fun handleSpec_parcelableRoundTrip_withNulls_works() {
        val handleSpec = HandleSpec(
            null, null, null,
            mutableSetOf(),
            personSchema
        )

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(handleSpec.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelableHandleSpec.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(handleSpec)
    }
}
