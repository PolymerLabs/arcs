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

package arcs.storage.parcelables

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.crdt.CrdtCount
import arcs.crdt.internal.VersionMap
import arcs.crdt.parcelables.ParcelableCrdtCount
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.crdt.parcelables.toParcelable
import arcs.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableModelUpdate]. */
@RunWith(AndroidJUnit4::class)
class ParcelableModelUpdateTest {
    @Test
    fun parcelableRoundtrip_works() {
        val data = CrdtCount.Data(
            mutableMapOf("Foo" to 1, "Bar" to 2),
            VersionMap("Foo" to 1, "Bar" to 1)
        )

        // Create a parcel and populate it with a ParcelableOperations object.
        val marshalled = with(Parcel.obtain()) {
            writeParcelable(
                ParcelableModelUpdate(data.toParcelable(), 1, ParcelableCrdtType.Count),
                0
            )
            marshall()
        }

        // Now unmarshall the parcel, so we can verify the contents.
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readParcelable<ParcelableModelUpdate>(ParcelableModelUpdate::class.java.classLoader)
        }

        // Now get them back out.
        assertThat(unmarshalled)
            .isEqualTo(
                ParcelableModelUpdate(ParcelableCrdtCount.Data(data), 1, ParcelableCrdtType.Count)
            )
        val actualized = requireNotNull(
            unmarshalled?.actualize<CrdtCount.Data, CrdtCount.Operation, Int>()
        )
        when (actualized) {
            is ProxyMessage.ModelUpdate ->
                assertThat(actualized.model).isEqualTo(data)
            else ->
                fail("Illegal type.")
        }
    }
}
