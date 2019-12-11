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

/** Tests for [ParcelableSyncRequest]. */
@RunWith(AndroidJUnit4::class)
class ParcelableSyncRequestTest {
    @Test
    fun parcelableRoundtrip_works() {
        val expected: List<ProxyMessage<CrdtCount.Data, CrdtCount.Operation, Int>> = listOf(
            ProxyMessage.SyncRequest(id = 1),
            ProxyMessage.SyncRequest(id = null)
        )
        val marshalled = with(Parcel.obtain()) {
            expected.forEach { writeProxyMessage(it, ParcelableCrdtType.Count, 0) }
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            0.until(expected.size).map { readProxyMessage() }
        }

        assertThat(unmarshalled).containsExactlyElementsIn(expected)
    }
}
