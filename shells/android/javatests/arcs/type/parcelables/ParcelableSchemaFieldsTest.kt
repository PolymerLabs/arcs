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
import arcs.core.data.SchemaFields
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableSchemaFields]. */
@RunWith(AndroidJUnit4::class)
class ParcelableSchemaFieldsTest {
    @Test
    fun parcelableRoundtrip_works() {
        val fields = SchemaFields(
            singletons = setOf("foo", "bar"),
            collections = setOf("fooCollection", "barCollection")
        )

        val marshalled = with(Parcel.obtain()) {
            writeSchemaFields(fields, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readSchemaFields()
        }

        assertThat(unmarshalled).isEqualTo(fields)
    }

    @Test
    fun parcelableRoundtrip_works_emptySets() {
        val fields = SchemaFields(
            singletons = emptySet(),
            collections = emptySet()
        )

        val marshalled = with(Parcel.obtain()) {
            writeSchemaFields(fields, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readSchemaFields()
        }

        assertThat(unmarshalled).isEqualTo(fields)
    }
}
