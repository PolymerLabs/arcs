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
import arcs.core.data.util.ReferencablePrimitive
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

  /**
   * Test merges where singleton names do not match.
   */
  @Test
  fun crdtEntity_merge_singletonFieldnameMismatch() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "fooBar" to Reference("fooBarRef")
      ),
      collections = mapOf()
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "bar" to Reference("barRef"),
        "fooBar" to Reference("fooBarRef")
      ),
      collections = mapOf()
    )
    val entityA = CrdtEntity(VersionMap(), rawEntityA)
    val entityAData = entityA.data
    val entityB = CrdtEntity(VersionMap(), rawEntityB)

    entityA.merge(entityB.data)
    entityB.merge(entityAData)

    assertThat(entityA.consumerView.singletons).containsExactlyEntriesIn(
      mapOf(
        "foo" to Reference("fooRef"),
        "fooBar" to Reference("fooBarRef")
      )
    )
    assertThat(entityB.consumerView.singletons).containsExactlyEntriesIn(
      mapOf(
        "bar" to Reference("barRef"),
        "fooBar" to Reference("fooBarRef")
      )
    )
  }

  /**
   * Test merges where a singleton's types do not match.
   * TODO(b/177036049): this is currently producing unexpected behaviour.
   * The test should be updated once b/177036049 is resolved.
   */
  @Test
  fun crdtEntity_merge_singletonFieldTypeMismatch() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf("koalas" to Reference("fooRef")),
      collections = mapOf()
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "koalas" to ReferencablePrimitive(Double::class, 1.0)
      ),
      collections = mapOf()
    )

    val entityA = CrdtEntity(VersionMap("me" to 1), rawEntityA)
    val entityAData = entityA.data
    val entityB = CrdtEntity(VersionMap("me" to 2), rawEntityB)

    entityA.merge(entityB.data)
    entityB.merge(entityAData)

    assertThat(entityA.consumerView.singletons["foo"]).isNull()
    assertThat(entityB.consumerView.singletons["foo"]).isNull()
  }

  /**
   * Test merges where collection names do not match.
   */
  @Test
  fun crdtEntity_merge_collectionFieldnameMismatch() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf(),
      collections = mapOf(
        "foo" to setOf(Reference("fooRef")),
        "fooBar" to setOf(Reference("fooBarRef"))
      )
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf(),
      collections = mapOf(
        "bar" to setOf(Reference("barRef")),
        "fooBar" to setOf(Reference("fooBarRef"))
      )
    )
    val entityA = CrdtEntity(VersionMap(), rawEntityA)
    val entityAData = entityA.data
    val entityB = CrdtEntity(VersionMap(), rawEntityB)

    entityA.merge(entityB.data)
    entityB.merge(entityAData)

    assertThat(entityA.consumerView.collections).containsExactlyEntriesIn(
      mapOf(
        "foo" to setOf(Reference("fooRef")),
        "fooBar" to setOf(Reference("fooBarRef"))
      )
    )
    assertThat(entityB.consumerView.collections).containsExactlyEntriesIn(
      mapOf(
        "bar" to setOf(Reference("barRef")),
        "fooBar" to setOf(Reference("fooBarRef"))
      )
    )
  }

  /**
   * Test merges where creationTimestamps do not match.
   */
  @Test
  fun crdtEntity_merge_creationTimestampMismatch() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf(),
      collections = mapOf(
        "foo" to setOf(Reference("fooRef")),
        "fooBar" to setOf(Reference("fooBarRef"))
      ),
      creationTimestamp = 1
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf(),
      collections = mapOf(
        "bar" to setOf(Reference("barRef")),
        "fooBar" to setOf(Reference("fooBarRef"))
      ),
      creationTimestamp = 2
    )
    val entityA = CrdtEntity(VersionMap(), rawEntityA)
    val entityAData = entityA.data
    val entityB = CrdtEntity(VersionMap(), rawEntityB)

    entityA.merge(entityB.data)
    entityB.merge(entityAData)

    assertThat(entityA.consumerView.creationTimestamp).isEqualTo(1)
    assertThat(entityB.consumerView.creationTimestamp).isEqualTo(1)
  }

  /**
   * Test merges where expirationTimestamps do not match.
   */
  @Test
  fun crdtEntity_merge_expirationTimestampMismatch() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf(),
      collections = mapOf(
        "foo" to setOf(Reference("fooRef")),
        "fooBar" to setOf(Reference("fooBarRef"))
      ),
      expirationTimestamp = 1
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf(),
      collections = mapOf(
        "bar" to setOf(Reference("barRef")),
        "fooBar" to setOf(Reference("fooBarRef"))
      ),
      expirationTimestamp = 2
    )
    val entityA = CrdtEntity(VersionMap(), rawEntityA)
    val entityAData = entityA.data
    val entityB = CrdtEntity(VersionMap(), rawEntityB)

    entityA.merge(entityB.data)
    entityB.merge(entityAData)

    assertThat(entityA.consumerView.expirationTimestamp).isEqualTo(1)
    assertThat(entityB.consumerView.expirationTimestamp).isEqualTo(1)
  }

  /**
   * Test merges where versionMaps do not match.
   */
  @Test
  fun crdtEntity_merge_entityVersionMapMismatch() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf()
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf()
    )

    val entityA = CrdtEntity(VersionMap("me" to 1), rawEntityA)
    val entityB = CrdtEntity(VersionMap("me" to 2), rawEntityB)
    val entityAData = entityA.data

    entityA.merge(entityB.data)
    entityB.merge(entityAData)

    assertThat(entityA.versionMap).isEqualTo(VersionMap("me" to 2))
    assertThat(entityB.versionMap).isEqualTo(VersionMap("me" to 2))
  }

  /**
   * Test merges where field-level versionMaps do not match.
   */
  @Test
  fun crdtEntity_merge_fieldVersionMapMismatch() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "bar" to Reference("barRef")
      ),
      collections = mapOf()
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "bar" to Reference("barRef")
      ),
      collections = mapOf()
    )

    val entityA = CrdtEntity(VersionMap(), rawEntityA)
    val entityB = CrdtEntity(VersionMap(), rawEntityB)

    val setFoo1 = SetSingleton(
      "me",
      VersionMap("me" to 1),
      "foo",
      Reference("op1")
    )
    val setBar1 = SetSingleton(
      "me",
      VersionMap("me" to 1),
      "bar",
      Reference("op1")
    )

    entityA.applyOperation(setFoo1)
    entityA.applyOperation(setBar1)
    entityA.applyOperation(SetSingleton(
      "me",
      VersionMap("me" to 2),
      "foo",
      Reference("op2")
    ))
    assertThat(entityA.consumerView.singletons["foo"]).isEqualTo(Reference("op2"))
    assertThat(entityA.consumerView.singletons["bar"]).isEqualTo(Reference("op1"))

    entityB.applyOperation(setFoo1)
    entityB.applyOperation(setBar1)
    entityB.applyOperation(SetSingleton(
      "me",
      VersionMap("me" to 2),
      "bar",
      Reference("op2")
    ))
    assertThat(entityB.consumerView.singletons["foo"]).isEqualTo(Reference("op1"))
    assertThat(entityB.consumerView.singletons["bar"]).isEqualTo(Reference("op2"))

    val entityAData = entityA.data
    entityA.merge(entityB.data)
    entityB.merge(entityAData)

    assertThat(entityA.consumerView.singletons["foo"]).isEqualTo(Reference("op2"))
    assertThat(entityB.consumerView.singletons["foo"]).isEqualTo(Reference("op2"))
    assertThat(entityA.consumerView.singletons["bar"]).isEqualTo(Reference("op2"))
    assertThat(entityB.consumerView.singletons["bar"]).isEqualTo(Reference("op2"))
  }

  /**
   * Test that the merge function is commutative.
   * i.e. A.merge(B).merge(C) = A.merge(C).merge(B)
   */
  @Test
  fun crdtEntity_merge_commutive() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )
    val entityA1 = CrdtEntity(VersionMap(), rawEntityA)
    val entityA2 = CrdtEntity(VersionMap(), rawEntityA)
    val mergedEntity1 = CrdtEntity(
      VersionMap(),
      RawEntity(
        id = "an-id",
        singletons = mapOf("foo" to Reference("fooRefMerge1")),
        collections = mapOf(
          "bar" to setOf(Reference("barRef1Merge1"), Reference("barRef2Merge1"))
        )
      )
    )
    val mergedEntity2 = CrdtEntity(
      VersionMap(),
      RawEntity(
        id = "an-id",
        singletons = mapOf("foo" to Reference("fooRefMerge2")),
        collections = mapOf(
          "bar" to setOf(Reference("barRef1Merge2"), Reference("barRef2Merge2"))
        )
      )
    )

    entityA1.merge(mergedEntity1.data)
    entityA1.merge(mergedEntity2.data)

    entityA2.merge(mergedEntity2.data)
    entityA2.merge(mergedEntity1.data)

    assertThat(entityA1.data).isEqualTo(entityA2.data)
    assertThat(entityA1.versionMap).isEqualTo(entityA2.versionMap)
  }

  /**
   * Verify that the merge operation is associative.
   * i.e. A.merge(B) = B.merge(A)
   */
  @Test
  fun crdtEntity_merge_associative() {
    val entity1 = CrdtEntity(
      VersionMap("me" to 1),
      RawEntity(
        id = "an-id",
        singletons = mapOf("foo" to Reference("fooRef")),
        collections = mapOf(
          "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
        )
      )
    )
    val entity2 = CrdtEntity(
      VersionMap("me" to 2),
      RawEntity(
        id = "an-id",
        singletons = mapOf("foo" to Reference("fooRef2")),
        collections = mapOf(
          "bar" to setOf(Reference("barRef3"), Reference("barRef4"))
        )
      )
    )
    val entity1Data = entity1.data

    entity1.merge(entity2.data)
    entity2.merge(entity1Data)

    assertThat(entity1.data).isEqualTo(entity2.data)
    assertThat(entity1.versionMap).isEqualTo(entity2.versionMap)
    assertThat(entity1.consumerView).isEqualTo(entity2.consumerView)
    assertThat(entity1.consumerView.collections["bar"]).containsExactly(
        Reference("barRef3"),
        Reference("barRef4")
    )
    assertThat(entity1.consumerView.singletons["foo"]).isEqualTo(Reference("fooRef2"))
  }

  /**
   * Test that reordering operations then merging the results produces the same output
   * ie:
   * (A.applyOp(B); C.applyOp(D); A.merge(C);) = (C.applyOp(B); A.applyOp(D); A.merge(C);)
   */
  @Test
  fun crdtEntity_applyOp_merge_commutative() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef2")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef3"), Reference("barRef4"))
      )
    )
    val entityA1 = CrdtEntity(VersionMap(), rawEntityA)
    val entityB1 = CrdtEntity(VersionMap(), rawEntityB)
    val entityA2 = CrdtEntity(VersionMap(), rawEntityA)
    val entityB2 = CrdtEntity(VersionMap(), rawEntityB)

    val op1 = SetSingleton(
      "me",
      VersionMap("me" to 1),
      "foo",
      Reference("op1")
    )
    val op2 = AddToSet(
      "me",
      VersionMap("me" to 1),
      "bar",
      Reference("op2")
    )

    entityA1.applyOperation(op1)
    entityB1.applyOperation(op2)
    assertThat(entityA1.consumerView.singletons["foo"]).isEqualTo(Reference("op1"))
    assertThat(entityB1.consumerView.collections["bar"]).contains(Reference("op2"))
    entityA1.merge(entityB1.data)

    entityB2.applyOperation(op1)
    entityA2.applyOperation(op2)
    assertThat(entityB2.consumerView.singletons["foo"]).isEqualTo(Reference("op1"))
    assertThat(entityA2.consumerView.collections["bar"]).contains(Reference("op2"))
    entityA2.merge(entityB2.data)

    assertThat(entityA1.data).isEqualTo(entityA2.data)
    assertThat(entityA1.versionMap).isEqualTo(entityA2.versionMap)
    assertThat(entityA1.consumerView).isEqualTo(entityA2.consumerView)
  }

  /**
   * Test that reordering operations with different actors on different fields produces the same
   * output
   * ie:
   * A.applyOp(byActorM_onFieldX); B.applyOp(byActorN_onFieldY); A.merge(B); =
   * B.applyOp(byActorN_onFieldY); A.applyOp(byActorM_onFieldX); A.merge(B)
   */
  @Test
  fun crdtEntity_applyOp_merge_commutative_differentActors() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "foo2" to Reference("refFoo")
      ),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef2"),
        "foo2" to Reference("refFoo2")
      ),
      collections = mapOf(
        "bar" to setOf(Reference("barRef3"), Reference("barRef4"))
      )
    )
    val entityA1 = CrdtEntity(VersionMap(), rawEntityA)
    val entityB1 = CrdtEntity(VersionMap(), rawEntityB)
    val entityA2 = CrdtEntity(VersionMap(), rawEntityA)
    val entityB2 = CrdtEntity(VersionMap(), rawEntityB)

    val op1 = SetSingleton(
      "op1",
      VersionMap("op1" to 1),
      "foo",
      Reference("op1")
    )
    val op2 = AddToSet(
      "op2",
      VersionMap("op2" to 1),
      "bar",
      Reference("op2")
    )

    entityA1.applyOperation(op1)
    entityB1.applyOperation(op2)
    assertThat(entityA1.consumerView.singletons["foo"]).isEqualTo(Reference("op1"))
    assertThat(entityB1.consumerView.collections["bar"]).contains(Reference("op2"))
    entityA1.merge(entityB1.data)

    entityB2.applyOperation(op1)
    entityA2.applyOperation(op2)
    assertThat(entityB2.consumerView.singletons["foo"]).isEqualTo(Reference("op1"))
    assertThat(entityA2.consumerView.collections["bar"]).contains(Reference("op2"))
    entityA2.merge(entityB2.data)

    assertThat(entityA1.data).isEqualTo(entityA2.data)
    assertThat(entityA1.versionMap).isEqualTo(entityA2.versionMap)
    assertThat(entityA1.consumerView).isEqualTo(entityA2.consumerView)
  }

  /**
   * Test that applying operations on an entity entity and merging the result into a non-empty
   * entity produces the same result as applying the operations on the non-empty entity.
   * i.e:
   * B = emptyEntity(); B.applyOp(x); B.applyOp(y); A.merge(B); =
   * A.applyOp(x); A.applyOp(y);
   */
  @Test
  fun crdtEntity_merge_equatesToOperations() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf()
      )
    )
    val emptyRawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to null),
      collections = mapOf(
        "bar" to setOf()
      )
    )
    val entity1 = CrdtEntity(VersionMap(), rawEntity)
    val entity2 = CrdtEntity(VersionMap(), rawEntity)
    val emptyEntity = CrdtEntity(VersionMap(), emptyRawEntity)

    val op1 = SetSingleton(
      "me",
      VersionMap("me" to 1),
      "foo",
      Reference("op1")
    )
    val op2 = AddToSet(
      "op2",
      VersionMap("op2" to 1),
      "bar",
      Reference("op2")
    )

    emptyEntity.applyOperation(op1)
    emptyEntity.applyOperation(op2)
    assertThat(emptyEntity.consumerView.singletons["foo"]).isEqualTo(Reference("op1"))
    assertThat(emptyEntity.consumerView.collections["bar"]).contains(Reference("op2"))
    entity1.merge(emptyEntity.data)

    entity2.applyOperation(op1)
    entity2.applyOperation(op2)
    assertThat(entity2.consumerView.singletons["foo"]).isEqualTo(Reference("op1"))
    assertThat(entity2.consumerView.collections["bar"]).contains(Reference("op2"))

    assertThat(entity1.data).isEqualTo(entity2.data)
    assertThat(entity1.versionMap).isEqualTo(entity2.versionMap)
    assertThat(entity1.consumerView).isEqualTo(entity2.consumerView)
  }

  /**
   * Test that remove an element from an entity then merging with an entity that added it back
   * produces the original entity.
   * i.e. if A = B then
   * B = A; A.applyOp(removeX); B.applyOp(addX) A.merge(B); =
   * A
   */
  @Test
  fun crdtEntity_merge_addAndRemoveElementSucceeds() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )
    val entity1 = CrdtEntity(VersionMap("me" to 1), rawEntity)
    val entity2 = CrdtEntity(VersionMap("me" to 1), rawEntity)

    val addOp = AddToSet(
      "me",
      VersionMap("me" to 2),
      "bar",
      Reference("barRef2")
    )
    val removeOp = RemoveFromSet(
      "me",
      VersionMap("me" to 1),
      "bar",
      "barRef2"
    )

    entity1.applyOperation(removeOp)
    entity2.applyOperation(removeOp)
    assertThat(entity1.consumerView.collections["bar"]).doesNotContain(Reference("barRef2"))
    assertThat(entity1.consumerView.collections["bar"]).doesNotContain(Reference("barRef2"))

    entity1.applyOperation(addOp)
    assertThat(entity1.consumerView.collections["bar"]).contains(Reference("barRef2"))

    entity1.merge(entity2.data)
    assertThat(entity1.consumerView.collections).containsExactlyEntriesIn(
      mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )
  }

  /**
   * Test merging an entity with itself succeeds.
   * i.e.
   * A = A.merge(A)
   */
  @Test
  fun crdtEntity_merge_mergeWithSelf() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity1 = CrdtEntity(VersionMap("me" to 1), rawEntity)
    val entity2 = CrdtEntity(VersionMap("me" to 1), rawEntity)

    entity1.merge(entity1.data)

    assertThat(entity2.data).isEqualTo(entity1.data)
    assertThat(entity2.versionMap).isEqualTo(entity1.versionMap)
    assertThat(entity2.consumerView).isEqualTo(entity1.consumerView)
  }

  @Test
  fun crdtEntity_merge_ApplySameOperationToMergingEntities() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity1 = CrdtEntity(VersionMap("me" to 1), rawEntity)
    val entity2 = CrdtEntity(VersionMap("me" to 1), rawEntity)

    val addOp = AddToSet(
      "me",
      VersionMap("me" to 2),
      "bar",
      Reference("barRefAdd")
    )

    entity1.applyOperation(addOp)
    entity2.applyOperation(addOp)
    assertThat(entity1.consumerView.collections["bar"]).contains(Reference("barRefAdd"))
    assertThat(entity2.consumerView.collections["bar"]).contains(Reference("barRefAdd"))

    entity1.merge(entity2.data)

    assertThat(entity1.data).isEqualTo(entity2.data)
    assertThat(entity1.versionMap).isEqualTo(entity2.versionMap)
    assertThat(entity1.consumerView).isEqualTo(entity2.consumerView)
  }

  /**
   * Test Changes after merge
   */
  @Test
  fun crdtEntity_merge_changes() {
    val rawEntityA = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRefA")),
      collections = mapOf(
        "bar" to setOf(Reference("barRefA1"), Reference("barRefA2"))
      )
    )
    val rawEntityB = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRefB")),
      collections = mapOf(
        "bar" to setOf(Reference("barRefB1"), Reference("barRefB2"))
      )
    )

    val entityA = CrdtEntity(VersionMap("me" to 1), rawEntityA)
    val entityA2 = CrdtEntity(VersionMap("me" to 1), rawEntityA)
    val entityA3 = CrdtEntity(VersionMap("me" to 1), rawEntityA)
    val entityB = CrdtEntity(VersionMap("me" to 2), rawEntityB)
    val entityB2 = CrdtEntity(VersionMap("me" to 2), rawEntityB)
    val entityB3 = CrdtEntity(VersionMap("me" to 2), rawEntityB)

    val changesA = entityA.merge(entityB.data)
    val changesB = entityB.merge(entityA2.data)
    entityA2.applyChanges(changesB.otherChange)
    entityA3.applyChanges(changesA.modelChange)
    entityB2.applyChanges(changesB.modelChange)
    entityB3.applyChanges(changesA.otherChange)

    assertThat(entityA.data).isEqualTo(entityB.data)
    assertThat(entityA.versionMap).isEqualTo(entityB.versionMap)
    assertThat(entityA.consumerView).isEqualTo(entityB.consumerView)

    assertThat(entityA2.data).isEqualTo(entityB.data)
    assertThat(entityA2.versionMap).isEqualTo(entityB.versionMap)
    assertThat(entityA2.consumerView).isEqualTo(entityB.consumerView)

    assertThat(entityA3.data).isEqualTo(entityB.data)
    assertThat(entityA3.versionMap).isEqualTo(entityB.versionMap)
    assertThat(entityA3.consumerView).isEqualTo(entityB.consumerView)

    assertThat(entityB2.data).isEqualTo(entityB.data)
    assertThat(entityB2.versionMap).isEqualTo(entityB.versionMap)
    assertThat(entityB2.consumerView).isEqualTo(entityB.consumerView)

    assertThat(entityB3.data).isEqualTo(entityB.data)
    assertThat(entityB3.versionMap).isEqualTo(entityB.versionMap)
    assertThat(entityB3.consumerView).isEqualTo(entityB.consumerView)

    assertThat(changesA.otherChange.isEmpty()).isTrue()
    assertThat(changesA.modelChange.isEmpty()).isFalse()
    assertThat(changesB.otherChange.isEmpty()).isFalse()
    assertThat(changesB.modelChange.isEmpty()).isTrue()
  }

  /**
   * Test that adding a field to two identical entities then removing it from one entity and
   * merging the results works.
   * i.e.
   * A = B;
   * A.add(fieldX); B.add(filedX); A.merge(B)
   */
  @Test
  fun crdtEntity_merge_clearedEntities() {
    val rawEntity = RawEntity(
      singletonFields = setOf("foo"),
      collectionFields = setOf("bar")
    )

    val entity1 = CrdtEntity(VersionMap(), rawEntity)
    val entity2 = CrdtEntity(VersionMap(), rawEntity)
    val initialEntity = CrdtEntity(VersionMap(), rawEntity)

    val setOp = SetSingleton(
      "me",
      VersionMap("me" to 1),
      "foo",
      Reference("fooRef")
    )

    val clearOp = ClearSingleton(
      "me",
      VersionMap("me" to 1),
      "foo"
    )

    entity1.applyOperation(setOp)
    entity2.applyOperation(setOp)
    assertThat(entity1.consumerView.singletons["foo"]).isEqualTo(Reference("fooRef"))
    assertThat(entity2.consumerView.singletons["foo"]).isEqualTo(Reference("fooRef"))
    entity2.applyOperation(clearOp)
    assertThat(entity2.consumerView.singletons["foo"]).isNull()
    entity1.merge(entity2.data)

    assertThat(entity1.consumerView.singletons["foo"]).isNull()
  }

  /**
   * Test adding and removing an element results in the original entity.
   */
  @Test
  fun crdtEntity_applyOperation_addAndRemove() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity1 = CrdtEntity(VersionMap(), rawEntity)
    val entity2 = CrdtEntity(VersionMap(), rawEntity)

    val addOp = AddToSet(
      "me",
      VersionMap("me" to 1),
      "bar",
      Reference("barRef3")
    )

    val removeOp = RemoveFromSet(
      "me",
      VersionMap("me" to 1),
      "bar",
      "barRef3"
    )

    entity1.applyOperation(addOp)
    assertThat(entity1.consumerView.collections["bar"]).contains(Reference("barRef3"))
    entity1.applyOperation(removeOp)

    assertThat(entity2.consumerView.collections["bar"])
      .isEqualTo(entity1.consumerView.collections["bar"])
  }

  /**
   * Test removing then adding an element results in the original entity.
   */
  @Test
  fun crdtEntity_applyOperation_removeAndAdd() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity1 = CrdtEntity(VersionMap("me" to 1), rawEntity)
    val entity2 = CrdtEntity(VersionMap("me" to 1), rawEntity)

    val removeOp = RemoveFromSet(
      "me",
      VersionMap("me" to 1),
      "bar",
      "barRef2"
    )

    val addOp = AddToSet(
      "me",
      VersionMap("me" to 2),
      "bar",
      Reference("barRef2")
    )

    entity1.applyOperation(removeOp)
    assertThat(entity1.consumerView.collections["bar"]).doesNotContain(Reference("barRef2"))
    entity1.applyOperation(addOp)

    assertThat(entity2.consumerView.collections["bar"])
      .isEqualTo(entity1.consumerView.collections["bar"])
  }

  /**
   * Test removing then adding an element results in the original entity.
   */
  @Test
  fun crdtEntity_applyOperation_setAndCleart() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "foo2" to Reference("foo2Ref")
      ),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity = CrdtEntity(VersionMap("me" to 1), rawEntity)

    val addOp = SetSingleton(
      "me",
      VersionMap("me" to 2),
      "foo",
      Reference("fooAddRef")
    )

    val clearOp = ClearSingleton(
      "me",
      VersionMap("me" to 2),
      "foo"
    )

    entity.applyOperation(addOp)
    assertThat(entity.consumerView.singletons["foo"]).isEqualTo(Reference("fooAddRef"))

    entity.applyOperation(clearOp)
    assertThat(entity.consumerView.singletons["foo"]).isNull()
    assertThat(entity.consumerView.singletons["foo2"]).isEqualTo(Reference("foo2Ref"))
  }

  /**
   * Test removing then adding an element results in the original entity.
   */
  @Test
  fun crdtEntity_applyOperation_clearAndSet() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "foo2" to Reference("foo2Ref")
      ),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity = CrdtEntity(VersionMap("me" to 1), rawEntity)

    val clearOp = ClearSingleton(
      "me",
      VersionMap("me" to 1),
      "foo"
    )

    val addOp = SetSingleton(
      "me",
      VersionMap("me" to 2),
      "foo",
      Reference("fooAddRef")
    )

    entity.applyOperation(clearOp)
    assertThat(entity.consumerView.singletons["foo"]).isNull()
    assertThat(entity.consumerView.singletons["foo2"]).isEqualTo(Reference("foo2Ref"))
    entity.applyOperation(addOp)

    assertThat(entity.consumerView.singletons["foo"]).isEqualTo(Reference("fooAddRef"))
  }

  /**
   * Test setting a singleton to a not-sequentially future versionMap succeeds.
   */
  @Test
  fun crdtEntity_applyOperation_addFutureReferenceMap() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "foo2" to Reference("foo2Ref")
      ),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity = CrdtEntity(VersionMap("me" to 1), rawEntity)

    val addOp = SetSingleton(
      "me",
      VersionMap("me" to 2),
      "foo",
      Reference("fooAddRef")
    )

    entity.applyOperation(addOp)
    assertThat(entity.consumerView.singletons["foo"]).isEqualTo(Reference("fooAddRef"))
    assertThat(entity.versionMap).isEqualTo(VersionMap("me" to 2))
  }

  /**
   * Test setting a singleton to an entity with an older VersionMap fails.
   */
  @Test
  fun crdtEntity_applyOperation_setOlderReferenceMap() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "foo2" to Reference("foo2Ref")
      ),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity = CrdtEntity(VersionMap("me" to 3), rawEntity)

    val setOp = SetSingleton(
      "me",
      VersionMap("me" to 2),
      "foo",
      Reference("fooAddRef")
    )

    entity.applyOperation(setOp)
    assertThat(entity.consumerView.singletons["foo"]).isEqualTo(Reference("fooRef"))
  }

  /**
   * Test adding to a collection with an older VersionMap.
   */
  @Test
  fun crdtEntity_applyOperation_addOlderReferenceMap() {
    val rawEntity = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "foo" to Reference("fooRef"),
        "foo2" to Reference("foo2Ref")
      ),
      collections = mapOf(
        "bar" to setOf(Reference("barRef1"), Reference("barRef2"))
      )
    )

    val entity = CrdtEntity(VersionMap("me" to 3), rawEntity)

    val addOp = AddToSet(
      "me",
      VersionMap("me" to 2),
      "bar",
      Reference("barAddRef")
    )

    entity.applyOperation(addOp)
    assertThat(entity.consumerView.collections["bar"]).doesNotContain(Reference("barAddRef"))
  }

  /**
   * Test CrdtSingleton.IOperation.toEntityOp for a CrdtSingleton.Operation.Clear.
   */
  @Test
  fun crdtEntity_singletonToEntityOp_clear() {
    val versionMap = VersionMap("me" to 1)
    @Suppress("UNCHECKED_CAST")
    val clear = CrdtSingleton.Operation.Clear<Reference>(
      "me",
      versionMap
    ) as CrdtSingleton.IOperation<CrdtEntity.Reference>
    val c = clear.toEntityOp("foo")
    assertThat(c).isEqualTo(ClearSingleton("me", versionMap, "foo"))
  }

  /**
   * Test CrdtSingleton.IOperation.toEntityOp for a CrdtSingleton.Operation.Update.
   */
  @Test
  fun crdtEntity_singletonToEntityOp_set() {
    val versionMap = VersionMap("me" to 1)
    @Suppress("UNCHECKED_CAST")
    val update = CrdtSingleton.Operation.Update<Reference>(
      "me",
      versionMap,
      Reference("fooRef")
    ) as CrdtSingleton.IOperation<CrdtEntity.Reference>
    val u = update.toEntityOp("foo")
    assertThat(u).isEqualTo(SetSingleton("me", versionMap, "foo", Reference("fooRef")))
  }

  /**
   * Test CrdtSet.IOperation.toEntityOp for a CrdtSet.Operation.Add.
   */
  @Test
  fun crdtEntity_collectionToEntityOp_add() {
    val versionMap = VersionMap("me" to 1)
    @Suppress("UNCHECKED_CAST")
    val add = CrdtSet.Operation.Add<Reference>(
      "me",
      versionMap,
      Reference("fooRef")
    ) as CrdtSet.IOperation<CrdtEntity.Reference>
    val a = add.toEntityOp("foo")
    assertThat(a).isEqualTo(AddToSet("me", versionMap, "foo", Reference("fooRef")))
  }

  /**
   * Test CrdtSet.IOperation.toEntityOp for a CrdtSet.Operation.Remove.
   */
  @Test
  fun crdtEntity_collectionToEntityOp_remove() {
    val versionMap = VersionMap("me" to 1)
    @Suppress("UNCHECKED_CAST")
    val remove = CrdtSet.Operation.Remove<Reference>(
      "me",
      versionMap,
      "fooRef"
    ) as CrdtSet.IOperation<CrdtEntity.Reference>
    val r = remove.toEntityOp("foo")
    assertThat(r).isEqualTo(RemoveFromSet("me", versionMap, "foo", "fooRef"))
  }

  /**
   * Test wrapping and unwrapping a Reference results in the original Reference.
   */
  @Test
  fun crdtEntity_wrappedReferencable_unwrap() {
    val ref = Reference("fooRef")
    val wrapped = CrdtEntity.WrappedReferencable(ref)
    val unwrapped = wrapped.unwrap()
    assertThat(ref).isEqualTo(unwrapped)
    assertThat(wrapped.id).isEqualTo(unwrapped.id)
  }

  /**
   * Test that wrapping and unwrapping a Reference using ReferenceImpl results in the original
   * Reference.
   */
  @Test
  fun crdtEntity_referenceImpl_unwrap() {
    val ref = Reference("fooRef")
    val wrapped = CrdtEntity.ReferenceImpl(ref.id)
    val unwrapped = wrapped.unwrap()
    assertThat(ref).isEqualTo(unwrapped)
    assertThat(wrapped.id).isEqualTo(unwrapped.id)
  }

  /**
   * Test the ReferenceImpl.toString method for both a Reference and a Primitive.
   */
  @Test
  fun crdtEntity_referenceImpl_toString() {
    val wrapped = CrdtEntity.ReferenceImpl("fooRef")
    assertThat(wrapped.toString()).isEqualTo("Reference(fooRef)")

    val stringEntity = "G'day!".toReferencable()
    val wrapped2 = CrdtEntity.ReferenceImpl(stringEntity.id)
    assertThat(wrapped2.toString())
      .isEqualTo("Reference(Primitive<kotlin.String>(G'day!))")
  }

  /**
   * Test converting a CrdtEntity.Data object to RawEntity produces the correct Entity.
   */
  @Test
  fun crdtEntity_dataToRawEntity_succeeds() {
    val fooRef = Reference("fooRef")
    val singletons: Map<String, CrdtSingleton<CrdtEntity.Reference>> = mapOf(
      "foo" to CrdtSingleton(VersionMap("me" to 1), fooRef)
    )

    val collections: Map<String, CrdtSet<CrdtEntity.Reference>> = mapOf(
      "bar" to CrdtSet(
        CrdtSet.DataImpl(
          VersionMap("me" to 1),
          mutableMapOf(
            "barRef1" to CrdtSet.DataValue(
              VersionMap("me" to 1), Reference("barRef1")
            )
          )
        )
      )
    )

    val data = CrdtEntity.Data(
      VersionMap("me" to 1),
      singletons,
      collections,
      -1,
      -1,
      "myID"
    )

    val rawEntity = RawEntity(
      id = "myID",
      singletons = mapOf("foo" to fooRef),
      collections = mapOf("bar" to setOf(Reference("barRef1")))
    )

    val entity = data.toRawEntity()

    assertThat(entity).isEqualTo(rawEntity)
  }

  /**
   * Test converting a CrdtEntity.Data object to a RawEntity with a ReferenceId produces the
   * correct Entity.
   */
  @Test
  fun crdtEntity_dataToRawEntity_withRefId_succeeds() {

    val fooRef = Reference("fooRef")
    val singletons: Map<String, CrdtSingleton<CrdtEntity.Reference>> = mapOf(
      "foo" to CrdtSingleton(VersionMap("me" to 1), fooRef)
    )

    val collections: Map<String, CrdtSet<CrdtEntity.Reference>> = mapOf(
      "bar" to CrdtSet(
        CrdtSet.DataImpl(
          VersionMap("me" to 1),
          mutableMapOf(
            "barRef1" to CrdtSet.DataValue(
              VersionMap("me" to 1), Reference("barRef1")
            )
          )
        )
      )
    )

    val data = CrdtEntity.Data(
      VersionMap("me" to 1),
      singletons,
      collections,
      -1,
      -1,
      "myID"
    )

    val rawEntity = RawEntity(
      id = "secondID",
      singletons = mapOf("foo" to fooRef),
      collections = mapOf("bar" to setOf(Reference("barRef1")))
    )

    val entity = data.toRawEntity("secondID")

    assertThat(entity).isEqualTo(rawEntity)
  }

  /**
   * Test copying a CrdtEntity.Data object produces an equal (but different) object.
   */
  @Test
  fun crdtEntity_dataCopy_succeeds() {

    val fooRef = Reference("fooRef")
    val singletons: Map<String, CrdtSingleton<CrdtEntity.Reference>> = mapOf(
      "foo" to CrdtSingleton(VersionMap("me" to 1), fooRef)
    )

    val collections: Map<String, CrdtSet<CrdtEntity.Reference>> = mapOf(
      "bar" to CrdtSet(
        CrdtSet.DataImpl(
          VersionMap("me" to 1),
          mutableMapOf(
            "barRef1" to CrdtSet.DataValue(
              VersionMap("me" to 1), Reference("barRef1")
            )
          )
        )
      )
    )

    val data = CrdtEntity.Data(
      VersionMap("me" to 1),
      singletons,
      collections,
      -1,
      -1,
      "myID"
    )

    val data2 = data.copy()

    assertThat(data).isEqualTo(data2)
    assertThat(data).isNotSameInstanceAs(data2)
  }

  /**
   * Use a different constructor for creating a CrdtEntity.Data object that will test the
   * buildCrdtSingletonMap and build CrdtSetMap functions.
   */
  @Test
  fun crdtEntity_data_buildSingletonsAndCollections() {
    val rawEntity = RawEntity(
      id = "secondID",
      singletons = mapOf("foo" to Reference("fooRef")),
      collections = mapOf("bar" to setOf(Reference("barRef1")))
    )

    val data = CrdtEntity.Data(
      VersionMap("me" to 1),
      rawEntity,
      CrdtEntity.Reference.Companion::buildReference
    )

    val entity = data.toRawEntity()

    assertThat(rawEntity).isEqualTo(entity)
    assertThat(rawEntity).isNotSameInstanceAs(entity)
  }

  /**
   * Test CrdtEntity.Operation.Update.toSingletonOp produces the correct
   * CrdtSingleton.Operation.Update object.
   */
  @Test
  fun crdtEntity_setSingleton_toSingletonOp() {
    val update = CrdtSingleton.Operation.Update<Reference>(
      "me",
      VersionMap("me" to 1),
      Reference("fooRef")
    )
    val set = SetSingleton(
      "me",
      VersionMap("me" to 1),
      "foo",
      Reference("fooRef")
    )
    val singletonOp = set.toSingletonOp()
    assertThat(singletonOp).isEqualTo(update)
  }

  /**
   * Test CrdtEntity.Operation.ClearSingleton.toSingletonOp produces the correct
   * CrdtSingleton.Operation.Clear object.
   */
  @Test
  fun crdtEntity_clearSingleton_toSingletonOp() {
    val clear = CrdtSingleton.Operation.Clear<Reference>(
      "me",
      VersionMap("me" to 1)
    )
    val clearSingleton = ClearSingleton(
      "me",
      VersionMap("me" to 1),
      "foo"
    )
    val singletonOp = clearSingleton.toSingletonOp()
    assertThat(singletonOp).isEqualTo(clear)
  }

  /**
   * Test CrdtEntity.Operation.Add.toSetOp produces the correct CrdtSet.Operation.Add object.
   */
  @Test
  fun crdtEntity_addToCollection_toSetOp() {
    val add = CrdtSet.Operation.Add<Reference>(
      "me",
      VersionMap("me" to 1),
      Reference("fooRef")
    )
    val addToSet = AddToSet(
      "me",
      VersionMap("me" to 1),
      "foo",
      Reference("fooRef")
    )
    val singletonOp = addToSet.toSetOp()
    assertThat(singletonOp).isEqualTo(add)
  }

  /**
   * Test CrdtEntity.Operation.Remove.toSetOp produces the correct CrdtSet.Operation.Remove object.
   */
  @Test
  fun crdtEntity_removeFromCollection_toSetOp() {
    val remove = CrdtSet.Operation.Remove<Reference>(
      "me",
      VersionMap("me" to 1),
      "fooRef"
    )
    val removeFromSet = RemoveFromSet(
      "me",
      VersionMap("me" to 1),
      "foo",
      "fooRef"
    )
    val singletonOp = removeFromSet.toSetOp()
    assertThat(singletonOp).isEqualTo(remove)
  }
}
