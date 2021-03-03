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
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.RawReference
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferencableProtoTest {
  @Before
  fun setUp() {
    StorageKeyManager.GLOBAL_INSTANCE.addParser(RamDiskStorageKey)
  }

  @Test
  fun parcelableRoundtrip_rawEntity() {
    val expected = RawEntity("id", mapOf("foo" to 5.toReferencable()))
    testReferencableRoundtrip(expected)
  }

  @Test
  fun parcelableRoundtrip_crdtEntity_referenceImpl() {
    val expected = CrdtEntity.ReferenceImpl("ref")
    testReferencableRoundtrip(expected)
  }

  @Test
  fun parcelableRoundtrip_crdtEntity_wrappedReferencable() {
    val expected = CrdtEntity.WrappedReferencable(5.toReferencable())
    testReferencableRoundtrip(expected)
  }

  @Test
  fun parcelableRoundtrip_reference() {
    val expected = RawReference("id", RamDiskStorageKey("key"), VersionMap("foo" to 1))
    testReferencableRoundtrip(expected)
  }

  @Test
  fun parcelableRoundtrip_referencablePrimitive() {
    val expected = ReferencablePrimitive(String::class, "foo")
    testReferencableRoundtrip(expected)
  }

  @Test
  fun parcelableRoundtrip_referencableList_primitive() {
    val expected = ReferencableList(listOf(7.toReferencable()), FieldType.ListOf(FieldType.Int))
    testReferencableRoundtrip(expected)
  }

  @Test
  fun parcelableRoundtrip_referencableList_entityRef() {
    val ref = RawReference("id", RamDiskStorageKey("key"), VersionMap("foo" to 1))
    val expected = listOf(ref).toReferencable(
      FieldType.ListOf(FieldType.EntityRef("hash"))
    )
    testReferencableRoundtrip(expected)
  }

  @Test
  fun parcelableRoundtrip_referencableList_inlineEntity() {
    val inlineEntity = RawEntity("id", mapOf("foo" to 5.toReferencable()))
    val expected = listOf(inlineEntity).toReferencable(
      FieldType.ListOf(FieldType.InlineEntity("hash"))
    )
    testReferencableRoundtrip(expected)
  }

  @Test
  fun toReferencable_referencableNotSet() {
    val empty = ReferencableProto.getDefaultInstance()
    assertThat(empty.referencableCase).isEqualTo(
      ReferencableProto.ReferencableCase.REFERENCABLE_NOT_SET
    )
    assertThat(empty.toReferencable()).isNull()
  }

  @Test
  fun toProto_referencableList_invalidFieldType() {
    val malformed = ReferencableList(listOf("foo".toReferencable()), FieldType.Char)
    assertFailsWith<IllegalArgumentException> {
      malformed.toProto()
    }.let {
      assertThat(it).hasMessageThat().isEqualTo(
        "ReferencableLists should have list field types but this one has Char"
      )
    }
  }

  @Test
  fun toProto_referencableList_invalidPrimitive() {
    val malformed = ReferencableList(
      listOf(8.toReferencable()),
      FieldType.ListOf(FieldType.ListOf(FieldType.Int))
    )
    assertFailsWith<UnsupportedOperationException> {
      malformed.toProto()
    }.let {
      assertThat(it).hasMessageThat().isEqualTo(
        "Unsupported Referencable: List([Primitive(8)])."
      )
    }
  }

  @Test
  fun toProto_invalidReferencable() {
    val malformed = object : Referencable {
      override val id = "id"
    }
    assertFailsWith<UnsupportedOperationException> {
      malformed.toProto()
    }.let {
      assertThat(it).hasMessageThat().startsWith(
        "Unsupported Referencable: arcs.android.crdt.ReferencableProtoTest"
      )
    }
  }

  private fun testReferencableRoundtrip(expected: Referencable) {
    val marshalled = with(Parcel.obtain()) {
      writeProto(expected.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencable()
    }
    assertThat(unmarshalled).isEqualTo(expected)
  }
}
