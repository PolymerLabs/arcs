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
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.data.CountType
import arcs.storage.ExistenceCriteria
import arcs.storage.StorageMode
import arcs.storage.StoreOptions
import arcs.storage.driver.RamDiskStorageKey
import arcs.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableStoreOptions]. */
@RunWith(AndroidJUnit4::class)
class ParcelableStoreOptionsTest {
    @Test
    fun parcelableRoundtrip_works() {
        val storeOptions = StoreOptions<CrdtCount.Data, CrdtCount.Operation, Int>(
            RamDiskStorageKey("test"),
            ExistenceCriteria.MayExist,
            CountType(),
            StorageMode.Direct,
            versionToken = "Foo",
            model = CrdtCount.Data()
        )

        val marshalled = with(Parcel.obtain()) {
            writeStoreOptions(storeOptions, ParcelableCrdtType.Count, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readStoreOptions()
        }

        assertThat(unmarshalled).isEqualTo(storeOptions)
    }

    @Test
    fun parcelableRoundtrip_works_withAllowableNullDefaults() {
        val storeOptions = StoreOptions<CrdtCount.Data, CrdtCount.Operation, Int>(
            ReferenceModeStorageKey(
                RamDiskStorageKey("backing"),
                RamDiskStorageKey("collection")
            ),
            ExistenceCriteria.ShouldExist,
            CountType(),
            StorageMode.ReferenceMode
        )

        val marshalled = with(Parcel.obtain()) {
            writeStoreOptions(storeOptions, ParcelableCrdtType.Count, 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readStoreOptions()
        }

        assertThat(unmarshalled).isEqualTo(storeOptions)
    }
}
