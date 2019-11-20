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

package arcs.type.parcelables

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.data.Schema
import arcs.data.SchemaDescription
import arcs.data.SchemaFields
import arcs.data.SchemaName
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableSchema]. */
@RunWith(AndroidJUnit4::class)
class ParcelableSchemaTest {
    @Test
    fun parcelableRoundtrip_works() {
        val schema = Schema(
            names = listOf(SchemaName("MySchema"), SchemaName("AlsoMySchema")),
            fields = SchemaFields(
                singletons = setOf("name", "age"),
                collections = setOf("friends")
            ),
            description = SchemaDescription("MySchemaPattern")
        )

        val marshalled = with(Parcel.obtain()) {
            writeSchema(schema, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readSchema()
        }

        assertThat(unmarshalled).isEqualTo(schema)
    }

    @Test
    fun parcelableRoundtrip_works_empty() {
        val schema = Schema(
            names = emptyList(),
            fields = SchemaFields(singletons = emptySet(), collections = emptySet()),
            description = SchemaDescription()
        )

        val marshalled = with(Parcel.obtain()) {
            writeSchema(schema, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readSchema()
        }

        assertThat(unmarshalled).isEqualTo(schema)
    }
}
