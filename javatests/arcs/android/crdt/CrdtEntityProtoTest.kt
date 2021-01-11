/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.android.crdt

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CrdtEntityProtoTest {

  @Test
  fun data_toData_dataPropagated() {
    assertThat(DUMMY_DATA_PROTO.toData()).isEqualTo(DUMMY_DATA)
  }

  @Test
  fun data_toProto_dataPropagated() {
    assertThat(DUMMY_DATA.toProto()).isEqualTo(DUMMY_DATA_PROTO)
  }

  @Test
  fun data_roundTrip_dataToProto() {
    val proto = DUMMY_DATA.toProto()
    assertThat(proto.toData()).isEqualTo(DUMMY_DATA)
  }

  @Test
  fun data_roundTrip_protoToData() {
    val data = DUMMY_DATA_PROTO.toData()
    assertThat(data.toProto()).isEqualTo(DUMMY_DATA_PROTO)
  }

  @Test
  fun operation_toOperation_setSingleton() {

  }

  @Test
  fun operation_toOperation_clearSingleton() {

  }

  @Test
  fun operation_toOperation_addToSet() {

  }

  @Test
  fun operation_toOperation_removeFromSet() {

  }

  @Test
  fun operation_toOperation_clearAll() {

  }

  @Test
  fun operation_toOperation_operationNotSet() {

  }

  @Test
  fun operation_toProto_setSingleton() {

  }

  @Test
  fun operation_toProto_clearSingleton() {

  }

  @Test
  fun operation_toProto_addToSet() {

  }

  @Test
  fun operation_toProto_removeFromSet() {

  }

  @Test
  fun operation_toProto_clearAll() {

  }

  @Test
  fun operation_toProto_operationNotSet() {

  }

  @Test
  fun operation_roundTrip_operationToProto() {

  }

  @Test
  fun operation_roundTrip_protoToOperation() {

  }

  companion object {

    val DUMMY_DATA = CrdtEntity.Data(
      versionMap = VersionMap("particle1" to 1, "particle5" to 12),
      singletons = mapOf(
        "single" to CrdtSingleton(
          versionMap = VersionMap("particle4" to 17),
          data = CrdtEntity.Reference.buildReference(5.toReferencable())
        )
      ),
      collections = mapOf(
        "collect" to CrdtSet(
          CrdtSet.DataImpl(
            versionMap = VersionMap("actor9" to 27),
            values = mutableMapOf(
              "Primitive<kotlin.Int>(7)" to CrdtSet.DataValue<CrdtEntity.Reference>(
                versionMap = VersionMap("actor12" to 1),
                value = CrdtEntity.Reference.buildReference(ReferencablePrimitive(Int::class, 7))
              )
            )
          )
        )
      ),
      creationTimestamp = 1610390619378,
      expirationTimestamp = 1610390640394,
      id = "DummyDataId"
    )

    val DUMMY_DATA_PROTO = CrdtEntityProto.Data.newBuilder()
      .setVersionMap(
        VersionMapProto.newBuilder()
          .putVersion("particle1", 1)
          .putVersion("particle5", 12)
      )
      .putAllSingletons(
        mapOf(
          "single" to CrdtSingletonProto.Data.newBuilder()
            .setVersionMap(VersionMapProto.newBuilder().putVersion("particle4", 17))
            .putValues(
              "Primitive<kotlin.Int>(5)",
              CrdtSetProto.DataValue.newBuilder()
                .setVersionMap(VersionMapProto.newBuilder().putVersion("particle4", 17))
                .setValue(
                  ReferencableProto.newBuilder()
                    .setCrdtEntityReference(
                      CrdtEntityReferenceProto.newBuilder()
                        .setId("Primitive<kotlin.Int>(5)")
                        .build()
                    )
                )
                .build()
            )
            .build()
        )
      )
      .putAllCollections(
        mapOf(
          "collect" to CrdtSetProto.Data.newBuilder()
            .setVersionMap(VersionMapProto.newBuilder().putVersion("actor9", 27))
            .putValues(
              "Primitive<kotlin.Int>(7)", CrdtSetProto.DataValue.newBuilder()
                .setVersionMap(VersionMapProto.newBuilder().putVersion("actor12", 1))
                .setValue(
                  ReferencableProto.newBuilder().setCrdtEntityReference(
                    CrdtEntityReferenceProto.newBuilder()
                      .setId("Primitive<kotlin.Int>(7)")
                      .build()
                  )
                )
                .build()
            )
            .build()
        )
      )
      .setCreationTimestampMs(1610390619378)
      .setExpirationTimestampMs(1610390640394)
      .setId("DummyDataId")
      .build()

  }
}
