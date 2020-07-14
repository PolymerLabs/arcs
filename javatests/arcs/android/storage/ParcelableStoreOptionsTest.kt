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
import arcs.core.data.CountType
import arcs.core.storage.StoreOptions
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableStoreOptions]. */
@RunWith(AndroidJUnit4::class)
class ParcelableStoreOptionsTest {
    @Test
    fun parcelableRoundtrip_works() {
        val storeOptions = StoreOptions(
            RamDiskStorageKey("test"),
            CountType(),
            versionToken = "Foo"
        )

        val marshalled = with(Parcel.obtain()) {
            writeStoreOptions(storeOptions, ParcelableCrdtType.Count, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readStoreOptions()
        }

        assertThat(unmarshalled).isEqualTo(storeOptions)
    }

    @Test
    fun parcelableRoundtrip_works_withAllowableNullDefaults() {
        val storeOptions = StoreOptions(
            ReferenceModeStorageKey(
                RamDiskStorageKey("backing"),
                RamDiskStorageKey("collection")
            ),
            CountType()
        )

        val marshalled = with(Parcel.obtain()) {
            writeStoreOptions(storeOptions, ParcelableCrdtType.Count, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readStoreOptions()
        }

        assertThat(unmarshalled).isEqualTo(storeOptions)
    }
}
