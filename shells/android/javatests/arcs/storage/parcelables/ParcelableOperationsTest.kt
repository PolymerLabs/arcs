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
import arcs.core.crdt.CrdtCount
import arcs.core.storage.ProxyMessage
import arcs.crdt.parcelables.ParcelableCrdtType
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableOperations]. */
@RunWith(AndroidJUnit4::class)
class ParcelableOperationsTest {
    @Test
    fun parcelableRoundtrip_works() {
        val expected = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
            listOf(
                CrdtCount.Operation.Increment(
                    actor = "foo",
                    version = 0 to 1
                ),
                CrdtCount.Operation.MultiIncrement(
                    actor = "bar",
                    version = 0 to 20,
                    delta = 20
                )
            ),
            id = 1
        )

        // Create a parcel and populate it with a ParcelableOperations object.
        val marshalled = with(Parcel.obtain()) {
            writeProxyMessage(expected, ParcelableCrdtType.Count, 0)
            marshall()
        }

        // Now unmarshall the parcel, so we can verify the contents.
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readProxyMessage()
        }
        assertThat(unmarshalled).isEqualTo(expected)
    }
}
