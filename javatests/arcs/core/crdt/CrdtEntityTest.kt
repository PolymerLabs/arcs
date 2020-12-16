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

package arcs.core.crdt

import arcs.core.crdt.CrdtEntity.Operation.AddToSet
import arcs.core.crdt.CrdtEntity.Operation.ClearAll
import arcs.core.crdt.CrdtEntity.Operation.ClearSingleton
import arcs.core.crdt.CrdtEntity.Operation.RemoveFromSet
import arcs.core.crdt.CrdtEntity.Operation.SetSingleton
import arcs.core.crdt.CrdtEntity.ReferenceImpl as Reference
import arcs.core.data.RawEntity
import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CrdtEntity]. */
@RunWith(JUnit4::class)
class CrdtEntityTest {
  @Test
  fun reasonableDefaults() {
    val rawEntity = RawEntity(
      singletonFields = setOf("foo"),
      collectionFields = setOf("bar")
    )
    val entity = CrdtEntity(VersionMap(), rawEntity)

    assertThat(entity.consumerView.singletons).isEqualTo(mapOf("foo" to null))
    assertThat(entity.consumerView.collections).isEqualTo(mapOf("bar" to emptySet<Reference>()))
    assertThat(entity.consumerView.creationTimestamp).isEqualTo(
      RawEntity.UNINITIALIZED_TIMESTAMP
    )
    assertThat(entity.consumerView.expirationTimestamp).isEqualTo(
      RawEntity.UNINITIALIZED_TIMESTAMP
    )
    assertThat(entity.consumerView.id).isEqualTo(RawEntity.NO_REFERENCE_ID)
  }

  @Test
  fun canApply_aSetOperation_toASingleField() {
    val rawEntity = RawEntity(
      singletonFields = setOf("foo"),
      collectionFields = setOf("bar")
    )
    val entity = CrdtEntity(VersionMap(), rawEntity)

    assertThat(
      entity.applyOperation(
        SetSingleton("me", VersionMap("me" to 1), "foo", Reference("fooRef"))
      )
    ).isTrue()
    assertThat(entity.consumerView.singletons).isEqualTo(mapOf("foo" to Reference("fooRef")))
    assertThat(entity.consumerView.collections).isEqualTo(mapOf("bar" to emptySet<Reference>()))
  }

  @Test
  fun initializesFromRawData() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2")),
        "baz" to setOf(Reference("bazRef"))
      ),
      creationTimestamp = 1L,
      expirationTimestamp = 2L
    )
    val entity = CrdtEntity(VersionMap(), rawEntity)

    assertThat(entity.data.singletons["foo"]?.consumerView)
      .isEqualTo(Reference("fooRef"))
    assertThat(entity.data.collections["bar"]?.consumerView)
      .containsExactly(
        Reference("barRef1"), Reference("barRef2")
      )
    assertThat(entity.data.collections["baz"]?.consumerView)
      .containsExactly(Reference("bazRef"))

    assertThat(entity.data.creationTimestamp).isEqualTo(1)
    assertThat(entity.data.expirationTimestamp).isEqualTo(2)
    assertThat(entity.data.id).isEqualTo("an-id")
  }

  @Test
  fun canApply_aClearOperation_toASingleField() {
    val rawEntity = RawEntity(
      singletons = mapOf("foo" to Reference("fooRef"))
    )
    val entity = CrdtEntity(VersionMap("me" to 1), rawEntity)

    assertThat(entity.applyOperation(ClearSingleton("me", VersionMap("me" to 1), "foo")))
      .isTrue()
    assertThat(entity.consumerView.singletons["foo"]).isNull()
  }

  @Test
  fun canApply_anAddOperation_toASingleField() {
    val rawEntity = RawEntity(
      singletonFields = setOf(),
      collectionFields = setOf("foo")
    )
    val entity = CrdtEntity(VersionMap(), rawEntity)

    assertThat(
      entity.applyOperation(
        AddToSet("me", VersionMap("me" to 1), "foo", Reference("fooRef"))
      )
    ).isTrue()
    assertThat(entity.consumerView.collections["foo"]).containsExactly(Reference("fooRef"))
  }

  @Test
  fun canApply_aRemoveOperation_toACollectionField() {
    val rawEntity = RawEntity(
      collections = mapOf("foo" to setOf(Reference("fooRef1"), Reference("fooRef2")))
    )
    val entity = CrdtEntity(VersionMap("me" to 1), rawEntity)

    assertThat(
      entity.applyOperation(
        RemoveFromSet("me", VersionMap("me" to 1), "foo", "fooRef1")
      )
    ).isTrue()
    assertThat(entity.consumerView.collections["foo"]).containsExactly(Reference("fooRef2"))
  }

  @Test
  fun canApplyOperations_toMultipleFields() {
    val rawEntity = RawEntity(
      singletonFields = setOf("name", "age"),
      collectionFields = setOf("tags", "favoriteNumbers")
    )
    val entity = CrdtEntity(VersionMap(), rawEntity)

    val name = Reference("bob")
    val age = Reference("42")
    val tag = Reference("#perf")
    val favoriteNumber = Reference("4")

    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "name", name))
    ).isTrue()
    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "age", age))
    ).isTrue()
    assertThat(
      entity.applyOperation(AddToSet("me", VersionMap("me" to 1), "tags", tag))
    ).isTrue()
    assertThat(
      entity.applyOperation(
        AddToSet("me", VersionMap("me" to 1), "favoriteNumbers", favoriteNumber)
      )
    ).isTrue()

    assertThat(entity.consumerView)
      .isEqualTo(
        RawEntity(
          singletons = mapOf(
            "name" to name,
            "age" to age
          ),
          collections = mapOf(
            "tags" to setOf(tag),
            "favoriteNumbers" to setOf(favoriteNumber)
          )
        )
      )
  }

  @Test
  fun clearAll() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2")),
        "baz" to setOf(Reference("bazRef"))
      ),
      creationTimestamp = 10L,
      expirationTimestamp = 20L
    )
    val entity = CrdtEntity(VersionMap(), rawEntity)

    assertThat(entity.applyOperation(ClearAll("me", VersionMap()))).isTrue()
    assertThat(entity.consumerView).isEqualTo(
      RawEntity(
        id = "an-id",
        singletonFields = setOf("foo"),
        collectionFields = setOf("bar", "baz"),
        creationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP
      )
    )
  }

  @Ignore("b/175657591 - Bug in CrdtEntity ClearAll operation")
  @Test
  fun clearAll_withDifferentVersionNumbers() {
    // Arrange.
    val rawEntity = RawEntity(
      id = "an-id",
      singletonFields = setOf("foo"),
      collectionFields = setOf("bar"),
      creationTimestamp = 10L,
      expirationTimestamp = 20L
    )
    val entity = CrdtEntity(VersionMap(), rawEntity)
    // Update singleton and collection fields separately, to put them at different versions.
    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "foo", Reference("foo1")))
    ).isTrue()
    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 2), "foo", Reference("foo2")))
    ).isTrue()
    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 3), "foo", Reference("foo3")))
    ).isTrue()
    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 4), "foo", Reference("foo4")))
    ).isTrue()
    assertThat(
      entity.applyOperation(AddToSet("me", VersionMap("me" to 1), "bar", Reference("bar1")))
    ).isTrue()
    assertThat(
      entity.applyOperation(AddToSet("me", VersionMap("me" to 2), "bar", Reference("bar2")))
    ).isTrue()
    // Check the initial state looks how we expect.
    assertThat(entity.consumerView).isEqualTo(
      RawEntity(
        id = "an-id",
        singletons = mapOf("foo" to Reference("foo4")),
        collections = mapOf("bar" to setOf(Reference("bar1"), Reference("bar2"))),
        creationTimestamp = 10L,
        expirationTimestamp = 20L
      )
    )

    // Act: clear the entire CrdtEntity.
    assertThat(entity.applyOperation(ClearAll("me", VersionMap("me" to 4)))).isTrue()

    // Assert: entity should be empty.
    assertThat(entity.consumerView).isEqualTo(
      RawEntity(
        id = "an-id",
        singletonFields = setOf("foo"),
        collectionFields = setOf("bar"),
        creationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP
      )
    )
  }

  @Test
  fun keepsSeparateVersionMaps_forSeparateFields() {
    val rawEntity = RawEntity(
      singletonFields = setOf("name", "age")
    )
    val entity = CrdtEntity(VersionMap(), rawEntity)

    val name1 = Reference("bob")
    val name2 = Reference("dave")
    val age1 = Reference("42")
    val age2 = Reference("37")

    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "name", name1))
    ).isTrue()
    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "age", age1))
    ).isTrue()
    assertThat(
      entity.applyOperation(SetSingleton("me", VersionMap("me" to 2), "name", name2))
    ).isTrue()
    assertThat(
      entity.applyOperation(
        SetSingleton("them", VersionMap("me" to 1, "them" to 1), "age", age2)
      )
    ).isTrue()
  }

  @Test
  fun failsWhen_anInvalidFieldName_isProvided() {
    val entity = CrdtEntity(VersionMap(), RawEntity("", emptySet(), emptySet()))

    assertFailsWith<CrdtException> {
      entity.applyOperation(
        SetSingleton("me", VersionMap("me" to 1), "invalid", Reference("foo"))
      )
    }
    assertFailsWith<CrdtException> {
      entity.applyOperation(
        ClearSingleton("me", VersionMap("me" to 1), "invalid")
      )
    }
    assertFailsWith<CrdtException> {
      entity.applyOperation(
        AddToSet("me", VersionMap("me" to 1), "invalid", Reference("foo"))
      )
    }
    assertFailsWith<CrdtException> {
      entity.applyOperation(
        RemoveFromSet("me", VersionMap("me" to 1), "invalid", "foo")
      )
    }
  }

  @Test
  fun failsWhen_singletonOperations_areProvidedTo_collectionFields() {
    val entity = CrdtEntity(
      VersionMap(),
      RawEntity(
        singletonFields = setOf(),
        collectionFields = setOf("things")
      )
    )

    assertFailsWith<CrdtException> {
      entity.applyOperation(
        SetSingleton("me", VersionMap("me" to 1), "things", Reference("foo"))
      )
    }
    assertFailsWith<CrdtException> {
      entity.applyOperation(
        ClearSingleton("me", VersionMap("me" to 1), "things")
      )
    }
  }

  @Test
  fun failsWhen_collectionOperations_areProvidedTo_singletonFields() {
    val entity = CrdtEntity(VersionMap(), RawEntity(singletonFields = setOf("thing")))

    assertFailsWith<CrdtException> {
      entity.applyOperation(AddToSet("me", VersionMap("me" to 1), "thing", Reference("foo")))
    }
    assertFailsWith<CrdtException> {
      entity.applyOperation(
        RemoveFromSet("me", VersionMap("me" to 1), "thing", "foo")
      )
    }
  }

  fun entity(
    creation: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
    expiration: Long = RawEntity.UNINITIALIZED_TIMESTAMP
  ) =
    CrdtEntity(
      VersionMap(),
      RawEntity(
        id = "an-id",
        singletons = mapOf(),
        collections = mapOf(),
        creationTimestamp = creation,
        expirationTimestamp = expiration
      )
    )

  @Test
  fun mergeCreationTimestampCorrectly() {
    var entity = entity()
    var entity2 = entity()
    entity.merge(entity2.data)
    assertThat(entity.data.creationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)

    entity = entity(creation = 5)
    entity2 = entity()
    entity.merge(entity2.data)
    assertThat(entity.data.creationTimestamp).isEqualTo(5)

    entity = entity()
    entity2 = entity(creation = 5)
    entity.merge(entity2.data)
    assertThat(entity.data.creationTimestamp).isEqualTo(5)

    entity = entity(creation = 5)
    entity2 = entity(creation = 5)
    entity.merge(entity2.data)
    assertThat(entity.data.creationTimestamp).isEqualTo(5)

    entity = entity(creation = 5)
    entity2 = entity(creation = 1)
    entity.merge(entity2.data)
    assertThat(entity.data.creationTimestamp).isEqualTo(1)
  }

  @Test
  fun mergeExpirationTimestampCorrectly() {
    var entity = entity()
    var entity2 = entity()
    entity.merge(entity2.data)
    assertThat(entity.data.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)

    entity = entity(expiration = 5)
    entity2 = entity()
    entity.merge(entity2.data)
    assertThat(entity.data.expirationTimestamp).isEqualTo(5)

    entity = entity()
    entity2 = entity(expiration = 5)
    entity.merge(entity2.data)
    assertThat(entity.data.expirationTimestamp).isEqualTo(5)

    entity = entity(expiration = 5)
    entity2 = entity(expiration = 5)
    entity.merge(entity2.data)
    assertThat(entity.data.expirationTimestamp).isEqualTo(5)

    entity = entity(expiration = 5)
    entity2 = entity(expiration = 1)
    entity.merge(entity2.data)
    assertThat(entity.data.expirationTimestamp).isEqualTo(1)
  }

  @Test
  fun mergeIdCorrectly() {
    var entity = CrdtEntity(VersionMap(), RawEntity())
    var entity2 = CrdtEntity(VersionMap(), RawEntity())
    entity.merge(entity2.data)
    assertThat(entity.data.id).isEqualTo(RawEntity.NO_REFERENCE_ID)

    entity = CrdtEntity(VersionMap(), RawEntity(id = "id"))
    entity2 = CrdtEntity(VersionMap(), RawEntity())
    entity.merge(entity2.data)
    assertThat(entity.data.id).isEqualTo("id")

    entity = CrdtEntity(VersionMap(), RawEntity())
    entity2 = CrdtEntity(VersionMap(), RawEntity(id = "id"))
    entity.merge(entity2.data)
    assertThat(entity.data.id).isEqualTo("id")

    entity = CrdtEntity(VersionMap(), RawEntity(id = "id"))
    entity2 = CrdtEntity(VersionMap(), RawEntity(id = "id"))
    assertThat(entity.data.id).isEqualTo("id")

    entity = CrdtEntity(VersionMap(), RawEntity(id = "id"))
    entity2 = CrdtEntity(VersionMap(), RawEntity(id = "id2"))
    assertFailsWith<CrdtException> {
      entity.merge(entity2.data)
    }
  }

  @Test
  fun mergeIntoEmptyModel() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )
    val emptyRawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to null),
      collections = mapOf(
        "bar" to setOf()
      )
    )
    val entity = CrdtEntity(VersionMap("me" to 1), rawEntity)
    val emptyEntity = CrdtEntity(VersionMap(), emptyRawEntity)

    val changes = emptyEntity.merge(entity.data)
    assertThat(changes.modelChange.isEmpty()).isFalse()
    assertThat(changes.otherChange.isEmpty()).isTrue()
  }

  @Test
  fun toCrdtEntityData_empty() {
    assertThat(RawEntity().toCrdtEntityData(VersionMap())).isEqualTo(CrdtEntity.Data())
  }

  @Test
  fun toCrdtEntityData_populated() {
    val entity = RawEntity(
      id = "entityId",
      singletons = mapOf(
        "txt" to "foo".toReferencable(),
        "ent" to RawEntity("id1", mapOf("val" to 3.toReferencable()))
      ),
      collections = mapOf(
        "num" to setOf(3.toReferencable(), 7.toReferencable())
      ),
      creationTimestamp = 30,
      expirationTimestamp = 70
    )
    val versionMap = VersionMap("me" to 1)
    val result = entity.toCrdtEntityData(versionMap) { CrdtEntity.ReferenceImpl("#" + it.id) }

    // Constructing the full expected CrdtEntity.Data is cumbersome; just check the fields manually.
    assertThat(result.id).isEqualTo("entityId")
    assertThat(result.versionMap).isEqualTo(versionMap)
    assertThat(result.creationTimestamp).isEqualTo(30)
    assertThat(result.expirationTimestamp).isEqualTo(70)

    val singletons = result.singletons
    assertThat(singletons).hasSize(2)
    assertThat(singletons["txt"]!!.consumerView!!.id).isEqualTo("#Primitive<kotlin.String>(foo)")
    assertThat(singletons["ent"]!!.consumerView!!.id).isEqualTo("#id1")

    val collections = result.collections
    assertThat(collections).hasSize(1)
    assertThat(collections["num"]!!.consumerView.map { it.id })
      .containsExactly("#Primitive<kotlin.Int>(3)", "#Primitive<kotlin.Int>(7)")
  }
}
