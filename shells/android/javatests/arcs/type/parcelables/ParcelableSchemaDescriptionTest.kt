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
import arcs.core.data.SchemaDescription
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableSchemaDescription]. */
@RunWith(AndroidJUnit4::class)
class ParcelableSchemaDescriptionTest {
    @Test
    fun parcelableRoundtrip_works() {
        val description = SchemaDescription(pattern = "blah", plural = "blahs")

        val marshalled = with(Parcel.obtain()) {
            writeSchemaDescription(description, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readSchemaDescription()
        }

        assertThat(unmarshalled).isEqualTo(description)
    }

    @Test
    fun parcelableRoundtrip_works_nullValues() {
        val description = SchemaDescription(pattern = null, plural = null)

        val marshalled = with(Parcel.obtain()) {
            writeSchemaDescription(description, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readSchemaDescription()
        }

        assertThat(unmarshalled).isEqualTo(description)
    }
}
