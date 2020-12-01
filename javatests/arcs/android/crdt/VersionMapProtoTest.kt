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
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class VersionMapProtoTest {
  @Test
  fun parcelableRoundTrip_works() {
    val emptyMap = VersionMap()
    val singleItem = VersionMap(mapOf("foo" to 10))
    val lotsOfItems = VersionMap(
      mapOf(
        "alice" to 1,
        "bob" to 2,
        "charlie" to 3,
        "delores" to 4,
        "evan" to 5,
        "felicia" to 6
      )
    )

    val marshalled = with(Parcel.obtain()) {
      writeProto(emptyMap.toProto())
      writeProto(singleItem.toProto())
      writeProto(lotsOfItems.toProto())
      marshall()
    }

    val unmarshalled = Parcel.obtain().apply {
      unmarshall(marshalled, 0, marshalled.size)
    }
    unmarshalled.setDataPosition(0)

    assertThat(unmarshalled.readVersionMap()).isEqualTo(emptyMap)
    assertThat(unmarshalled.readVersionMap()).isEqualTo(singleItem)
    assertThat(unmarshalled.readVersionMap()).isEqualTo(lotsOfItems)
  }
}
