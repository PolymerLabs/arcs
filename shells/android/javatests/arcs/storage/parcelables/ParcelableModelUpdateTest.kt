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
import arcs.crdt.CrdtCount
import arcs.crdt.internal.VersionMap
import arcs.crdt.parcelables.ParcelableCrdtCount
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Tests for [ParcelableSyncRequest]. */
@RunWith(RobolectricTestRunner::class)
class ParcelableModelUpdateTest {
    @Test
    fun parcelableRoundtrip_works() {
        val bundle = Bundle()
        val data = CrdtCount.Data(
            mutableMapOf("Foo" to 1, "Bar" to 2),
            VersionMap("Foo" to 1, "Bar" to 1)
        )
        bundle.putParcelable(
            "myCountModelUpdate",
            ParcelableModelUpdate(ParcelableCrdtCount.Data(data), 1, ParcelableCrdtType.Count)
        )

        // Now get them back out.
        val deparcalized = bundle.getParcelable<ParcelableModelUpdate>("myCountModelUpdate")
        assertThat(deparcalized)
            .isEqualTo(
                ParcelableModelUpdate(ParcelableCrdtCount.Data(data), 1, ParcelableCrdtType.Count)
            )
        val actualized = requireNotNull(
            deparcalized?.actualize<CrdtCount.Data, CrdtCount.Operation, Int>()
        )
        when (actualized) {
            is ProxyMessage.ModelUpdate ->
                assertThat(actualized.model).isEqualTo(data)
            else ->
                fail("Illegal type.")
        }
    }
}
