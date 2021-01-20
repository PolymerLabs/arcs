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
    val proto = DUMMY_DATA_PROTO.toBuilder()
      .setCreationTimestampMs(333L)
      .setId("fooId")
      .build()

    assertThat(proto.toData()).isEqualTo(DUMMY_DATA.copy(creationTimestamp = 333L, id = "fooId"))
  }

  @Test
  fun data_toProto_dataPropagated() {
    val data = DUMMY_DATA.copy(expirationTimestamp = 444L, id = "barId")

    assertThat(data).isEqualTo(
      DUMMY_DATA_PROTO.toBuilder()
        .setExpirationTimestampMs(444L)
        .setId("barId")
        .build()
    )
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

    private val DUMMY_VERSION_MAP = VersionMap("actor1" to 1, "actor4" to 121)
    private val DUMMY_CRDT_SINGLETON = CrdtSingleton(
      versionMap = DUMMY_VERSION_MAP,
      data = CrdtEntity.Reference.buildReference(5.toReferencable())
    )
    private val DUMMY_CRDT_SET = CrdtSet(
      CrdtSet.DataImpl(
        versionMap = DUMMY_VERSION_MAP,
        values = mutableMapOf(
          "Primitive<kotlin.Int>(7)" to CrdtSet.DataValue(
            versionMap = DUMMY_VERSION_MAP,
            value = CrdtEntity.Reference.buildReference(ReferencablePrimitive(Int::class, 7))
          )
        )
      )
    )
    DUMMY_ACTOR = "actor9"

    val DUMMY_DATA = CrdtEntity.Data(
      versionMap = DUMMY_VERSION_MAP,
      singletons = mapOf("single" to DUMMY_CRDT_SINGLETON),
      collections = mapOf("collect" to DUMMY_CRDT_SET),
      creationTimestamp = 111,
      expirationTimestamp = 222,
      id = "DummyDataId"
    )
    val DUMMY_DATA_PROTO: CrdtEntityProto.Data = CrdtEntityProto.Data.newBuilder()
      .setVersionMap(DUMMY_VERSION_MAP.toProto())
      .putAllSingletons(
        mapOf("single" to DUMMY_CRDT_SINGLETON.data.toProto())
      )
      .putAllCollections(
        mapOf("collect" to DUMMY_CRDT_SET.data.toProto())
      )
      .setCreationTimestampMs(111)
      .setExpirationTimestampMs(222)
      .setId("DummyDataId")
      .build()

    val DUMMY_OP_SET_SINGLETON = CrdtEntity.Operation.SetSingleton(
      actor = "actor5",
      versionMap = DUMMY_VERSION_MAP,
      field = "singleSet",
      value = CrdtEntity.Reference.buildReference(6.toReferencable())
    )
    val DUMMY_OP_SET_SINGLETON_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setSetSingleton(
          CrdtEntityProto.Operation.SetSingleton.newBuilder()
            .setActor("actor5")
            .setVersionMap(DUMMY_VERSION_MAP.toProto())
            .setField("singleSet")
            .setValue(CrdtEntityReferenceProto.newBuilder().setId("Primitive<kotlin.Int>(6)"))
        )
        .build()

    val DUMMY_OP_CLEAR_SINGLETON = CrdtEntity.Operation.ClearSingleton(
      actor = "actor9",
      versionMap = DUMMY_VERSION_MAP,
      field = "singleClear"
    )
    val DUMMY_OP_CLEAR_SINGLETON_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setClearSingleton(
          CrdtEntityProto.Operation.ClearSingleton.newBuilder()
            .setActor("actor9")
            .setVersionMap(DUMMY_VERSION_MAP.toProto())
            .setField("singleClear")
        )
        .build()

    val DUMMY_OP_ADD_TO_SET = CrdtEntity.Operation.AddToSet(
      actor = "actor1",
      versionMap = DUMMY_VERSION_MAP,
      field = "add",
      added = CrdtEntity.Reference.buildReference(4.toReferencable())
    )
    val DUMMY_OP_ADD_TO_SET_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setAddToSet(
          CrdtEntityProto.Operation.AddToSet.newBuilder()
            .setActor("actor1")
            .setVersionMap(DUMMY_VERSION_MAP.toProto())
            .setField("add")
            .setAdded(
              CrdtEntityReferenceProto.newBuilder().setId("Primitive<kotlin.Int>(4)")
            )
        )
        .build()

    val DUMMY_OP_REMOVE_FROM_SET = CrdtEntity.Operation.RemoveFromSet(
      actor = "actor3",
      versionMap = DUMMY_VERSION_MAP,
      field = "rm",
      removed = "Primitive<kotlin.Int>(4)"
    )
    val DUMMY_OP_REMOVE_FROM_SET_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setRemoveFromSet(
          CrdtEntityProto.Operation.RemoveFromSet.newBuilder()
            .setActor("actor3")
            .setVersionMap(DUMMY_VERSION_MAP.toProto())
            .setField("rm")
            .setRemoved("Primitive<kotlin.Int>(4)")
        )
        .build()

    val DUMMY_OP_CLEAR_ALL = CrdtEntity.Operation.ClearAll(
      actor = "actor4",
      versionMap = DUMMY_VERSION_MAP
    )
    val DUMMY_OP_CLEAR_ALL_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder()
        .setClearAll(
          CrdtEntityProto.Operation.ClearAll.newBuilder()
            .setActor("actor4")
            .setVersionMap(DUMMY_VERSION_MAP.toProto())
        )
        .build()

    val DUMMY_OPERATION_NOT_SET_PROTO: CrdtEntityProto.Operation =
      CrdtEntityProto.Operation.newBuilder().build()
  }
}
