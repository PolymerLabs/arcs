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
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.driver.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableHandleConnectionSpec]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableHandleConnectionSpecTest {

    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to Text), emptyMap()),
        SchemaDescription(),
        "42"
    )

    @Test
    fun handleConnectionSpec_parcelableRoundTrip_works() {
        val handleConnectionSpec = HandleConnectionSpec(
            VolatileStorageKey(ArcId.newForTest("foo"), "bar"),
            EntityType(personSchema)
        )

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(handleConnectionSpec.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelableHandleConnectionSpec.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(handleConnectionSpec)
    }
}
