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
import arcs.core.data.RawEntity
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RawEntityProtoTest {
    @Test
    fun parcelableRoundTrip_works() {
        val entity = RawEntity(
            id = "reference-id",
            singletonFields = setOf("a"),
            collectionFields = setOf("b", "c")
        )

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

    @Test
    fun parcelableRoundTrip_withNestedRawEntities_works() {
        val entity1 = RawEntity("entity1", setOf(), setOf())
        val entity2 = RawEntity("entity2", setOf(), setOf())
        val entity3 = RawEntity("entity3", setOf(), setOf())
        val uberEntity = RawEntity(
            id = "uberEntity",
            singletons = mapOf("a" to entity1),
            collections = mapOf("b" to setOf(entity2, entity3))
        )

        val marshalled = with(Parcel.obtain()) {
            writeProto(uberEntity.toProto())
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readRawEntity()
        }

        assertThat(unmarshalled).isEqualTo(uberEntity)
    }
}
