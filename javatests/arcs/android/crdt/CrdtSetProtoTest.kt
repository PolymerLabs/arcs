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
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CrdtSetProtoTest {
  private val versionMap: VersionMap = VersionMap("alice" to 1, "bob" to 2)
  private val entity1: Referencable = RawEntity("ref-id-1", setOf("a"), setOf())
  private val entity2: Referencable = RawEntity("ref-id-2", setOf(), setOf("b"))

  @Test
  fun dataValue_parcelableRoundTrip_works() {
    val dataValue = CrdtSet.DataValue(versionMap, entity1)

    val marshalled = with(Parcel.obtain()) {
      writeProto(dataValue.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readCrdtSetDataValue()
    }

    assertThat(unmarshalled).isEqualTo(dataValue)
  }

  @Test
  fun data_parcelableRoundTrip_works() {
    val data = CrdtSet.DataImpl(
      versionMap, mutableMapOf(
        entity1.id to CrdtSet.DataValue(VersionMap("alice" to 1), entity1),
        entity2.id to CrdtSet.DataValue(VersionMap("alice" to 1), entity2)
      )
    )

    val marshalled = with(Parcel.obtain()) {
      writeModelData(data)
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readModelData()
    }

    assertThat(unmarshalled).isEqualTo(data)
  }

  @Test
  fun operationAdd_parcelableRoundTrip_works() {
    val op = CrdtSet.Operation.Add("alice", versionMap, entity1)

    val marshalled = with(Parcel.obtain()) {
      writeOperation(op)
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readOperation()
    }

    assertThat(unmarshalled).isEqualTo(op)
  }

  @Test
  fun operationRemove_parcelableRoundTrip_works() {
    val op = CrdtSet.Operation.Remove<Referencable>("alice", versionMap, entity1.id)

    val marshalled = with(Parcel.obtain()) {
      writeOperation(op)
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readOperation()
    }

    assertThat(unmarshalled).isEqualTo(op)
  }

  @Test
  fun operationClear_parcelableRoundTrip_works() {
    val op = CrdtSet.Operation.Clear<Referencable>("alice", versionMap)

    val marshalled = with(Parcel.obtain()) {
      writeOperation(op)
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readOperation()
    }

    assertThat(unmarshalled).isEqualTo(op)
  }

  @Test
  fun operationFastForward_parcelableRoundTrip_works() {
    val oldVersionMap = VersionMap("alice" to 1)
    val newVersionMap = VersionMap("alice" to 1, "bob" to 1)
    val op = CrdtSet.Operation.FastForward(
      oldVersionMap,
      newVersionMap,
      added = mutableListOf(CrdtSet.DataValue(newVersionMap, entity1)),
      removed = mutableListOf(entity2)
    )

    val marshalled = with(Parcel.obtain()) {
      writeOperation(op)
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readOperation()
    }

    assertThat(unmarshalled).isEqualTo(op)
  }
}
