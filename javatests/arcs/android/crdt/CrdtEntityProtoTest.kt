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
import kotlin.test.assertFailsWith
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
    assertThat(DUMMY_OP_SET_SINGLETON_PROTO.toOperation()).isEqualTo(DUMMY_OP_SET_SINGLETON)
  }

  @Test
  fun operation_toOperation_clearSingleton() {
    assertThat(DUMMY_OP_CLEAR_SINGLETON_PROTO.toOperation()).isEqualTo(DUMMY_OP_CLEAR_SINGLETON)
  }

  @Test
  fun operation_toOperation_addToSet() {
    assertThat(DUMMY_OP_ADD_TO_SET_PROTO.toOperation()).isEqualTo(DUMMY_OP_ADD_TO_SET)
  }

  @Test
  fun operation_toOperation_removeFromSet() {
    assertThat(DUMMY_OP_REMOVE_FROM_SET_PROTO.toOperation()).isEqualTo(DUMMY_OP_REMOVE_FROM_SET)
  }

  @Test
  fun operation_toOperation_clearAll() {
    assertThat(DUMMY_OP_CLEAR_ALL_PROTO.toOperation()).isEqualTo(DUMMY_OP_CLEAR_ALL)
  }

  @Test
  fun operation_toOperation_operationNotSet() {
    assertFailsWith<UnsupportedOperationException> {
      DUMMY_OPERATION_NOT_SET_PROTO.toOperation()
    }.also {
      assertThat(it).hasMessageThat().contains("Unknown CrdtEntity.Operation type:")
    }
  }

  @Test
  fun operation_toProto_setSingleton() {
    assertThat(DUMMY_OP_SET_SINGLETON.toProto()).isEqualTo(DUMMY_OP_SET_SINGLETON_PROTO)
  }

  @Test
  fun operation_toProto_clearSingleton() {
    assertThat(DUMMY_OP_CLEAR_SINGLETON.toProto()).isEqualTo(DUMMY_OP_CLEAR_SINGLETON_PROTO)
  }

  @Test
  fun operation_toProto_addToSet() {
    assertThat(DUMMY_OP_ADD_TO_SET.toProto()).isEqualTo(DUMMY_OP_ADD_TO_SET_PROTO)
  }

  @Test
  fun operation_toProto_removeFromSet() {
    assertThat(DUMMY_OP_REMOVE_FROM_SET.toProto()).isEqualTo(DUMMY_OP_REMOVE_FROM_SET_PROTO)
  }

  @Test
  fun operation_toProto_clearAll() {
    assertThat(DUMMY_OP_CLEAR_ALL.toProto()).isEqualTo(DUMMY_OP_CLEAR_ALL_PROTO)
  }

  @Test
  fun operation_roundTrip_operationToProto_setSingleton() {
    roundTripFromOperation(DUMMY_OP_SET_SINGLETON)
  }

  @Test
  fun operation_roundTrip_operationToProto_clearSingleton() {
    roundTripFromOperation(DUMMY_OP_CLEAR_SINGLETON)
  }

  @Test
  fun operation_roundTrip_operationToProto_addToSet() {
    roundTripFromOperation(DUMMY_OP_ADD_TO_SET)
  }

  @Test
  fun operation_roundTrip_operationToProto_removeFromSet() {
    roundTripFromOperation(DUMMY_OP_REMOVE_FROM_SET)
  }

  @Test
  fun operation_roundTrip_operationToProto_clearAll() {
    roundTripFromOperation(DUMMY_OP_CLEAR_ALL)
  }

  @Test
  fun operation_roundTrip_protoToOperation_setSingleton() {
    roundTripFromOperationProto(DUMMY_OP_SET_SINGLETON_PROTO)
  }

  @Test
  fun operation_roundTrip_protoToOperation_clearSingleton() {
    roundTripFromOperationProto(DUMMY_OP_CLEAR_SINGLETON_PROTO)
  }

  @Test
  fun operation_roundTrip_protoToOperation_addToSet() {
    roundTripFromOperationProto(DUMMY_OP_ADD_TO_SET_PROTO)
  }

  @Test
  fun operation_roundTrip_protoToOperation_removeFromSet() {
    roundTripFromOperationProto(DUMMY_OP_REMOVE_FROM_SET_PROTO)
  }

  @Test
  fun operation_roundTrip_protoToOperation_clearAll() {
    roundTripFromOperationProto(DUMMY_OP_CLEAR_ALL_PROTO)
  }

  companion object {
    fun roundTripFromOperation(op: CrdtEntity.Operation) {
      assertThat(op.toProto().toOperation()).isEqualTo(op)
    }

    fun roundTripFromOperationProto(proto: CrdtEntityProto.Operation) {
      assertThat(proto.toOperation().toProto()).isEqualTo(proto)
    }

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
    val DUMMY_DATA_PROTO: CrdtEntityProto.Data = CrdtEntityProto.Data.newBuilder()
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

    val DUMMY_OP_SET_SINGLETON = CrdtEntity.Operation.SetSingleton(
      actor = "actor5",
      versionMap = VersionMap(
        "actor9" to 2,
        "actor11" to 1
      ),
      field = "singleSet",
      value = CrdtEntity.Reference.buildReference(6.toReferencable())
    )
    val DUMMY_OP_SET_SINGLETON_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setSetSingleton(
          CrdtEntityProto.Operation.SetSingleton.newBuilder()
            .setActor("actor5")
            .setVersionMap(
              VersionMapProto.newBuilder()
                .putVersion("actor9", 2)
                .putVersion("actor11", 1)
            )
            .setField("singleSet")
            .setValue(CrdtEntityReferenceProto.newBuilder().setId("Primitive<kotlin.Int>(6)"))
        )
        .build()

    val DUMMY_OP_CLEAR_SINGLETON = CrdtEntity.Operation.ClearSingleton(
      actor = "actor9",
      versionMap = VersionMap(
        "actor5" to 3
      ),
      field = "singleClear"
    )
    val DUMMY_OP_CLEAR_SINGLETON_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setClearSingleton(
          CrdtEntityProto.Operation.ClearSingleton.newBuilder()
            .setActor("actor9")
            .setVersionMap(
              VersionMapProto.newBuilder().putVersion("actor5", 3)
            )
            .setField("singleClear")
        )
        .build()

    val DUMMY_OP_ADD_TO_SET = CrdtEntity.Operation.AddToSet(
      actor = "actor1",
      versionMap = VersionMap(),
      field = "add",
      added = CrdtEntity.Reference.buildReference(4.toReferencable())
    )
    val DUMMY_OP_ADD_TO_SET_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setAddToSet(
          CrdtEntityProto.Operation.AddToSet.newBuilder()
            .setActor("actor1")
            .setVersionMap(VersionMapProto.newBuilder())
            .setField("add")
            .setAdded(
              CrdtEntityReferenceProto.newBuilder().setId("Primitive<kotlin.Int>(4)")
            )
        )
        .build()

    val DUMMY_OP_REMOVE_FROM_SET = CrdtEntity.Operation.RemoveFromSet(
      actor = "actor3",
      versionMap = VersionMap(
        "actor9" to 1,
        "actor1" to 3
      ),
      field = "rm",
      removed = "Primitive<kotlin.Int>(4)"
    )
    val DUMMY_OP_REMOVE_FROM_SET_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setRemoveFromSet(
          CrdtEntityProto.Operation.RemoveFromSet.newBuilder()
            .setActor("actor3")
            .setVersionMap(
              VersionMapProto.newBuilder()
                .putVersion("actor9", 1)
                .putVersion("actor1", 3)
            )
            .setField("rm")
            .setRemoved("Primitive<kotlin.Int>(4)")
        )
        .build()

    val DUMMY_OP_CLEAR_ALL = CrdtEntity.Operation.ClearAll(
      actor = "actor4",
      versionMap = VersionMap(
        "actor1" to 1
      )
    )
    val DUMMY_OP_CLEAR_ALL_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setClearAll(
          CrdtEntityProto.Operation.ClearAll.newBuilder()
            .setActor("actor4")
            .setVersionMap(
              VersionMapProto.newBuilder().putVersion("actor1", 1)
            )
        )
        .build()

    val DUMMY_OPERATION_NOT_SET_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder().build()
  }
}
