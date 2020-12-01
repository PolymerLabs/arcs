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
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ParcelableCrdtEntityTest {
  private val versionMap: VersionMap = VersionMap("alice" to 1, "bob" to 3)

  private val referenceA: CrdtEntity.Reference = CrdtEntity.ReferenceImpl("AAA")
  private val referenceB: CrdtEntity.Reference = CrdtEntity.ReferenceImpl("BBB")
  private val referenceC: CrdtEntity.Reference = CrdtEntity.ReferenceImpl("CCC")

  @Test
  fun referenceImpl_parcelableRoundTrip_works() {
    val reference = CrdtEntity.ReferenceImpl("ref")

    val marshalled = with(Parcel.obtain()) {
      writeProto(reference.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readCrdtEntityReference()
    }

    assertThat(unmarshalled).isEqualTo(reference)
  }

  @Test
  fun data_parcelableRoundTrip_works() {
    val data = CrdtEntity.Data(
      VersionMap("alice" to 1, "bob" to 2),
      singletons = mapOf(
        "a" to CrdtSingleton(VersionMap("alice" to 1), referenceA),
        "b" to CrdtSingleton(VersionMap("bob" to 1), referenceB)
      ),
      collections = mapOf(
        "c" to CrdtSet.createWithData(
          CrdtSet.DataImpl(
            VersionMap("bob" to 3),
            mutableMapOf(
              "CCC" to CrdtSet.DataValue(
                VersionMap("bob" to 2),
                referenceC
              )
            )
          )
        )
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

    assertThat((unmarshalled as? CrdtEntity.Data)?.toRawEntity()).isEqualTo(data.toRawEntity())
  }

  @Test
  fun operationSetSingleton_parcelableRoundTrip_works() {
    val op = CrdtEntity.Operation.SetSingleton("alice", versionMap, "field", referenceA)

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
  fun operationClearSingleton_parcelableRoundTrip_works() {
    val op = CrdtEntity.Operation.ClearSingleton("alice", versionMap, "field")

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
  fun operationAddToSet_parcelableRoundTrip_works() {
    val op = CrdtEntity.Operation.AddToSet("alice", versionMap, "field", referenceA)

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
  fun operationRemoveFromSet_parcelableRoundTrip_works() {
    val op = CrdtEntity.Operation.RemoveFromSet("alice", versionMap, "field", referenceA.id)

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
