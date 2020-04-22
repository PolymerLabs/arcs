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

package arcs.android.storage

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.util.requireProto
import arcs.android.util.writeProto
import arcs.core.crdt.CrdtCount
import arcs.core.crdt.VersionMap
import arcs.core.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableOperations]. */
@RunWith(AndroidJUnit4::class)
class ProxyMessageProtoTest {
    @Test
    fun syncRequest_parcelableRoundtrip_works() {
        val expected: List<ProxyMessage<CrdtCount.Data, CrdtCount.Operation, Int>> = listOf(
            ProxyMessage.SyncRequest(id = 1),
            ProxyMessage.SyncRequest(id = null)
        )
        val marshalled = with(Parcel.obtain()) {
            expected.forEach { writeProto(it.toProto()) }
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            0.until(expected.size).map {
                requireProto(ProxyMessageProto.getDefaultInstance()).toProxyMessage()
            }
        }

        assertThat(unmarshalled).containsExactlyElementsIn(expected)
    }

    @Test
    fun modelUpdate_parcelableRoundtrip_works() {
        val expected = ProxyMessage.ModelUpdate<CrdtCount.Data, CrdtCount.Operation, Int>(
            CrdtCount.Data(
                mutableMapOf("Foo" to 1, "Bar" to 2),
                VersionMap("Foo" to 1, "Bar" to 1)
            ),
            id = 1
        )

        // Create a parcel and populate it with a ParcelableOperations object.
        val marshalled = with(Parcel.obtain()) {
            writeProto(expected.toProto())
            marshall()
        }

        // Now unmarshall the parcel, so we can verify the contents.
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            requireProto(ProxyMessageProto.getDefaultInstance()).toProxyMessage()
        }

        assertThat(unmarshalled).isEqualTo(expected)
    }

    @Test
    fun operations_parcelableRoundtrip_works() {
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
            writeProto(expected.toProto())
            marshall()
        }

        // Now unmarshall the parcel, so we can verify the contents.
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            requireProto(ProxyMessageProto.getDefaultInstance()).toProxyMessage()
        }
        assertThat(unmarshalled).isEqualTo(expected)
    }
}
