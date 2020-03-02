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

package arcs.android.storage

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.crdt.ParcelableRawEntity
import arcs.android.crdt.readReferencable
import arcs.android.crdt.writeReference
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.storage.Reference
import arcs.core.storage.driver.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ParcelableReferenceTest {
    @Before
    fun setUp() {
        RamDiskStorageKey.registerParser()
    }

    @Test
    fun parcelableRoundtrip_works_withNullVersionMap() {
        val expected = Reference("myId", RamDiskStorageKey("backingKey"), null)

        // Create a parcel and populate it with a ParcelableOperations object.
        val marshalled = with(Parcel.obtain()) {
            writeReference(expected, 0)
            marshall()
        }

        // Now unmarshall the parcel, so we can verify the contents.
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readReferencable()
        }
        assertThat(unmarshalled).isEqualTo(expected)
    }

    @Test
    fun parcelableRoundtrip_works_withNonNullVersionMap() {
        val expected = Reference(
            "myId",
            RamDiskStorageKey("backingKey"),
            VersionMap("foo" to 1)
        )

        // Create a parcel and populate it with a ParcelableOperations object.
        val marshalled = with(Parcel.obtain()) {
            writeReference(expected, 0)
            marshall()
        }

        // Now unmarshall the parcel, so we can verify the contents.
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readReferencable()
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
            writeTypedObject(ParcelableRawEntity(expected), 0)
            marshall()
        }

        // Now unmarshall the parcel, so we can verify the contents.
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readReferencable()
        }
        assertThat(unmarshalled).isEqualTo(expected)
    }
}
