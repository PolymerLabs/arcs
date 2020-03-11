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
import arcs.core.data.Plan.HandleConnection
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.HandleMode
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableHandleConnection]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableHandleConnectionTest {

    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to Text), emptyMap()),
        "42"
    )

    @Test
    fun handleConnection_parcelableRoundTrip_works() {
        val handleConnection = HandleConnection(
            VolatileStorageKey(ArcId.newForTest("foo"), "bar"),
            HandleMode.ReadWrite,
            EntityType(personSchema)
        )

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(handleConnection.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelableHandleConnection.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(handleConnection)
    }
}
