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
import arcs.core.data.RawEntity
import arcs.core.data.testutil.RawEntitySubject.Companion.assertThat
import arcs.core.entity.testutil.FixtureEntities
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RawEntityProtoTest {
  @Test
  fun parcelableRoundTrip_works() {
    val entity = FixtureEntities().generate(entityId = "reference-id").serialize()
    assertRoundTrip(entity)
  }

  @Test
  fun parcelableRoundTrip_withEmptyEntity_works() {
    val emptyEntity = FixtureEntities().generateEmpty().serialize()
    assertRoundTrip(emptyEntity)
  }

  @Test
  fun parcelableRoundTrip_withNullId_works() {
    val entity = FixtureEntities().generate(entityId = null).serialize()
    assertRoundTrip(entity)
  }

  @Test
  fun parcelableRoundTrip_withCreationTimestampSet_works() {
    val entity = FixtureEntities().generate(creationTimestamp = 111L).serialize()
    assertRoundTrip(entity)
  }

  @Test
  fun parcelableRoundTrip_withExpirationTimestampSet_works() {
    val entity = FixtureEntities().generate(expirationTimestamp = 222L).serialize()
    assertRoundTrip(entity)
  }

  @Test
  fun parcelableRoundTrip_withASetOfSingletons_works() {
    val entity = RawEntity(id = "entity", singletonFields = setOf("a", "b", "c"))
    assertRoundTrip(entity)
  }

  @Test
  fun parcelableRoundTrip_withASetOfCollections_works() {
    val entity = RawEntity(
      id = "entity",
      singletonFields = emptySet(),
      collectionFields = setOf("e", "f", "g")
    )
    assertRoundTrip(entity)
  }

  companion object {
    private fun assertRoundTrip(entity: RawEntity) {
      val marshalled = with(Parcel.obtain()) {
        writeProto(entity.toProto())
        marshall()
      }
      val unmarshalled = with(Parcel.obtain()) {
        unmarshall(marshalled, 0, marshalled.size)
        setDataPosition(0)
        readRawEntity()
      }
      assertThat(unmarshalled).isEqualTo(entity)
    }
  }
}
