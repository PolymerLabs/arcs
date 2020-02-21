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

package arcs.android.type

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
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
                singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
                collections = mapOf("friends" to FieldType.EntityRef("hash"))
            ),
            hash = "hash"
        )

        val marshalled = with(Parcel.obtain()) {
            writeSchema(schema, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readSchema()
        }

        assertThat(unmarshalled).isEqualTo(schema)
    }

    @Test
    fun parcelableRoundtrip_works_empty() {
        val schema = Schema(
            names = emptyList(),
            fields = SchemaFields(singletons = emptyMap(), collections = emptyMap()),
            hash = "hash"
        )

        val marshalled = with(Parcel.obtain()) {
            writeSchema(schema, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readSchema()
        }

        assertThat(unmarshalled).isEqualTo(schema)
    }
}
