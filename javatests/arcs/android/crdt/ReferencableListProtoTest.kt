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
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.RawEntity
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferencableListProtoTest {
  @Before
  fun setUp() {
    StorageKeyManager.GLOBAL_INSTANCE.addParser(RamDiskStorageKey)
  }

  @Test
  fun parcelableRoundTrip_worksFor_primitives() {
    val list = listOf(4, 5, 4, 6).map {
      it.toReferencable()
    }.toReferencable(FieldType.ListOf(FieldType.Primitive(PrimitiveType.Int)))

    val marshalled = with(Parcel.obtain()) {
      writeProto(list.toPrimitiveListProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readOrderedPrimitiveList()
    }

    assertThat(unmarshalled).isEqualTo(list)
  }

  @Test
  fun toPrimitiveListProto_errors_nonPrimitiveInList() {
    val list = listOf(
      Reference("id", RamDiskStorageKey("key"), VersionMap("foo" to 1))
    ).toReferencable(FieldType.ListOf(FieldType.Primitive(PrimitiveType.Int)))

    assertFailsWith<IllegalArgumentException> {
      Parcel.obtain().writeProto(list.toPrimitiveListProto())
    }.let {
      assertThat(it).hasMessageThat().isEqualTo(
        "Non-primitive found in ReferencableList of primitives"
      )
    }
  }

  @Test
  fun toPrimitiveListProto_errors_invalidFieldType() {
    val list = listOf(
      Reference("id", RamDiskStorageKey("key"), VersionMap("foo" to 1))
    ).toReferencable(FieldType.ListOf(FieldType.EntityRef("hash")))

    assertFailsWith<IllegalStateException> {
      Parcel.obtain().writeProto(list.toPrimitiveListProto())
    }.let {
      assertThat(it).hasMessageThat().isEqualTo(
        "Invalid FieldType &hash for ReferencableList of primitives"
      )
    }
  }

  @Test
  fun parcelableRoundTrip_worksFor_references() {
    val expected1 = Reference(
      "myId",
      RamDiskStorageKey("backingKey"),
      VersionMap("foo" to 1),
      10, // creationTimestamp
      20 // expirationTimestamp
    )
    val expected2 = Reference(
      "myNextId",
      RamDiskStorageKey("backingKey"),
      VersionMap("bar" to 1),
      50, // creationTimestamp
      70 // expirationTimestamp
    )

    val list = listOf(expected1, expected2, expected2).toReferencable(
      FieldType.ListOf(FieldType.EntityRef("hash"))
    )

    val marshalled = with(Parcel.obtain()) {
      writeProto(list.toReferenceListProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readOrderedReferenceList()
    }

    assertThat(unmarshalled).isEqualTo(list)
  }

  @Test
  fun toReferenceListProto_errors_nonReferenceInList() {
    val list = listOf(4.toReferencable()).toReferencable(
      FieldType.ListOf(FieldType.EntityRef("hash"))
    )

    assertFailsWith<IllegalArgumentException> {
      Parcel.obtain().writeProto(list.toReferenceListProto())
    }.let {
      assertThat(it).hasMessageThat().isEqualTo(
        "Non-reference found in ReferencableList of references"
      )
    }
  }

  @Test
  fun toReferenceListProto_errors_invalidFieldType() {
    val list = listOf(4.toReferencable()).toReferencable(
      FieldType.ListOf(FieldType.Primitive(PrimitiveType.Int))
    )

    assertFailsWith<IllegalStateException> {
      Parcel.obtain().writeProto(list.toReferenceListProto())
    }.let {
      assertThat(it).hasMessageThat().isEqualTo(
        "Invalid FieldType Int for ReferencableList of references"
      )
    }
  }

  @Test
  fun parcelableRoundTrip_worksFor_inlineEntities() {
    val inlineEntity1 = toInlineEntity("id1", "text1", 11.0, setOf("a", "b"), 30, 40)
    val inlineEntity2 = toInlineEntity("id2", "text2", 22.0, setOf("c"), 50, 60)

    val list = listOf(inlineEntity1, inlineEntity2, inlineEntity1).toReferencable(
      FieldType.ListOf(FieldType.InlineEntity("inlineHash"))
    )

    val marshalled = with(Parcel.obtain()) {
      writeProto(list.toInlineEntityListProto())
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readOrderedInlineEntityList()
    }

    assertThat(unmarshalled).isEqualTo(list)
  }

  @Test
  fun toInlineEntityListProto_errors_nonReferenceInList() {
    val list = listOf(4.toReferencable()).toReferencable(
      FieldType.ListOf(FieldType.InlineEntity("inlineHash"))
    )

    assertFailsWith<IllegalArgumentException> {
      Parcel.obtain().writeProto(list.toInlineEntityListProto())
    }.let {
      assertThat(it).hasMessageThat().isEqualTo(
        "Non-entity found in ReferencableList of inline entities"
      )
    }
  }

  @Test
  fun toInlineEntityListProto_errors_invalidFieldType() {
    val list = listOf(4.toReferencable()).toReferencable(
      FieldType.ListOf(FieldType.Primitive(PrimitiveType.Int))
    )

    assertFailsWith<IllegalStateException> {
      Parcel.obtain().writeProto(list.toInlineEntityListProto())
    }.let {
      assertThat(it).hasMessageThat().isEqualTo(
        "Invalid FieldType Int for ReferencableList of inline entities"
      )
    }
  }

  private fun toInlineEntity(
    id: String,
    text: String,
    number: Double,
    collection: Set<String>,
    creationTimestamp: Long,
    expirationTimestamp: Long
  ): RawEntity {
    return RawEntity(
      id,
      mapOf(
        "inlineText" to text.toReferencable(),
        "inlineNumber" to number.toReferencable()
      ),
      mapOf(
        "inlineTextCollection" to collection.map { it.toReferencable() }.toSet()
      ),
      creationTimestamp,
      expirationTimestamp
    )
  }
}
