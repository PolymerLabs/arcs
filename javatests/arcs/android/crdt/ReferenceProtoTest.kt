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

package arcs.android.crdt

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.util.writeProto
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.storage.Reference
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferenceProtoTest {
    @Before
    fun setUp() {
        RamDiskStorageKey.registerParser()
    }

    @Test
    fun parcelableRoundtrip_works_withNullVersionMap() {
        val expected = Reference("myId", RamDiskStorageKey("backingKey"), null)

        testReferenceRoundtrip(expected)
    }

    @Test
    fun parcelableRoundtrip_works_withNonNullVersionMap() {
        val expected = Reference(
            "myId",
            RamDiskStorageKey("backingKey"),
            VersionMap("foo" to 1)
        )

        testReferenceRoundtrip(expected)
    }

    @Test
    fun parcelableRoundtrip_works_withTimestamps() {
        val expected = Reference(
            "myId",
            RamDiskStorageKey("backingKey"),
            VersionMap("foo" to 1),
            10, // creationTimestamp
            20 // expirationTimestamp
        )
        testReferenceRoundtrip(expected)
    }

    fun testReferenceRoundtrip(expected: Reference) {
        // Create a parcel and populate it with a ParcelableOperations object.
        val marshalled = with(Parcel.obtain()) {
            writeProto(expected.toProto())
            marshall()
        }

        // Now unmarshall the parcel, so we can verify the contents.
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readReference()
        }
        assertThat(unmarshalled).isEqualTo(expected)
    }

    @Test
    fun parcelableRoundtripWorks_whenReference_isPartOfRawEntity() {
        val expectedReference = Reference(
            "myId",
            RamDiskStorageKey("backingKey"),
            VersionMap("foo" to 1)
        )
        val expected = RawEntity(
            "myId",
            singletons = mapOf("foo" to expectedReference),
            collections = emptyMap()
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
            readRawEntity()
        }
        assertThat(unmarshalled).isEqualTo(expected)
    }
}
