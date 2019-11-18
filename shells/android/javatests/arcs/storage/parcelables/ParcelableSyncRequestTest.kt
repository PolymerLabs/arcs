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

import android.os.Bundle
import arcs.crdt.parcelables.ParcelableCrdtType
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Tests for [ParcelableSyncRequest]. */
@RunWith(RobolectricTestRunner::class)
class ParcelableSyncRequestTest {
    @Test
    fun parcelableRoundtrip_works() {
        val bundle = Bundle()
        bundle.putParcelable(
            "myCountSyncRequest",
            ParcelableSyncRequest(1, ParcelableCrdtType.Count)
        )
        bundle.putParcelable(
            "mySetSyncRequest",
            ParcelableSyncRequest(null, ParcelableCrdtType.Set)
        )
        bundle.putParcelable(
            "mySingletonSyncRequest",
            ParcelableSyncRequest(1, ParcelableCrdtType.Singleton)
        )
        bundle.putParcelable(
            "myEntitySyncRequest",
            ParcelableSyncRequest(1, ParcelableCrdtType.Entity)
        )

        // Now get them back out.
        assertThat(bundle.getParcelable<ParcelableSyncRequest>("myCountSyncRequest"))
            .isEqualTo(ParcelableSyncRequest(1, ParcelableCrdtType.Count))
        assertThat(bundle.getParcelable<ParcelableSyncRequest>("mySetSyncRequest"))
            .isEqualTo(ParcelableSyncRequest(null, ParcelableCrdtType.Set))
        assertThat(bundle.getParcelable<ParcelableSyncRequest>("mySingletonSyncRequest"))
            .isEqualTo(ParcelableSyncRequest(1, ParcelableCrdtType.Singleton))
        assertThat(bundle.getParcelable<ParcelableSyncRequest>("myEntitySyncRequest"))
            .isEqualTo(ParcelableSyncRequest(1, ParcelableCrdtType.Entity))
    }
}
