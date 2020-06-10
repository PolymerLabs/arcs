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

package arcs.android.crdt

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.util.writeProto
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferencableListProtoTest {
    @Test
    fun parcelableRoundTrip_works_for_primitives() {
        val list = listOf(4, 5, 4, 6).map { it.toReferencable() }.toReferencable(FieldType.Primitive(PrimitiveType.Int))

        val marshalled = with(Parcel.obtain()) {
            writeProto(list.toPrimitiveListProto())
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readOrderedPrimitiveList()
        }

        assertThat(unmarshalled).isEqualTo(list)
    }

    fun parcelableRoundTrip_works_for_references() {
        val expected1 = Reference(
            "myId",
            RamDiskStorageKey("backingKey"),
            VersionMap("foo" to 1),
            10, // creationTimestamp
            20 // expirationTimestamp
        )
        val expected2 = Reference(
            "myNextId",
            RamDiskStorageKey("backingKey"),
            VersionMap("bar" to 1),
            50, // creationTimestamp
            70 // expirationTimestamp
        )

        val list = listOf(expected1, expected2, expected2).toReferencable(FieldType.EntityRef("foobarbaz"))

        val marshalled = with(Parcel.obtain()) {
            writeProto(list.toReferenceListProto())
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readOrderedReferenceList()
        }

        assertThat(unmarshalled).isEqualTo(list)
    }
}
