package arcs.core.storage.testutil

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.crdt.testing.CrdtSetHelper
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat

/**
 * Testing base class for [ReferenceModeStore] tests. Subclasses can override this class to run its
 * suite of tests for its own database backend.
 */
open class ReferenceModeStoreTestBase {
  // TODO(b/171729186): Move all tests that are shared between ReferenceModeStoreTest,
  // ReferenceModeStoreDatabaseIntegrationTest and ReferenceModeStoreDatabaseImplIntegrationTest
  // here.

  protected val HASH = "abcd9876"

  protected val INLINE_HASH = "INLINE_HASH"
  protected val INLINE_SCHEMA = Schema(
    setOf(SchemaName("Inline")),
    SchemaFields(
      singletons = mapOf(
        "inlineName" to FieldType.Text
      ),
      collections = emptyMap()
    ),
    INLINE_HASH
  )

  protected val SCHEMA = Schema(
    setOf(SchemaName("person")),
    SchemaFields(
      singletons = mapOf(
        "name" to FieldType.Text,
        "age" to FieldType.Number,
        "list" to FieldType.ListOf(FieldType.Long),
        "inline" to FieldType.InlineEntity(INLINE_HASH)
      ),
      collections = emptyMap()
    ),
    HASH
  )

  /** Constructs a new [CrdtSet] paired with a [CrdtSetHelper]. */
  protected fun <T : Referencable> createCrdtSet(
    actor: String
  ): Pair<CrdtSet<T>, CrdtSetHelper<T>> {
    val collection = CrdtSet<T>()
    val collectionHelper = CrdtSetHelper(actor, collection)
    return collection to collectionHelper
  }

  protected fun createPersonEntity(
    id: ReferenceId,
    name: String,
    age: Int,
    list: List<Long>,
    inline: String
  ): RawEntity {
    val inlineEntity = RawEntity(
      "",
      singletons = mapOf(
        "inlineName" to inline.toReferencable()
      )
    )

    return RawEntity(
      id = id,
      singletons = mapOf(
        "name" to name.toReferencable(),
        "age" to age.toDouble().toReferencable(),
        "list" to list.map {
          it.toReferencable()
        }.toReferencable(FieldType.ListOf(FieldType.Long)),
        "inline" to inlineEntity
      )
    )
  }

  protected fun createEmptyPersonEntity(id: ReferenceId): RawEntity = RawEntity(
    id = id,
    singletons = mapOf(
      "name" to null,
      "age" to null,
      "list" to null,
      "inline" to null
    )
  )

  protected fun createPersonEntityCrdt(): CrdtEntity = CrdtEntity(
    VersionMap(),
    RawEntity(singletonFields = setOf("name", "age", "list", "inline"))
  )

  /**
   * Asserts that the receiving map of entities (values from a CrdtSet/CrdtSingleton) are equal to
   * the [other] map of entities, on an ID-basis.
   */
  protected fun Map<ReferenceId, CrdtSet.DataValue<RawEntity>>.assertEquals(
    other: Map<ReferenceId, CrdtSet.DataValue<RawEntity>>
  ) {
    assertThat(keys).isEqualTo(other.keys)
    forEach { (refId, myEntity) ->
      val otherEntity = requireNotNull(other[refId])
      // Should have same fields.
      assertThat(myEntity.value.singletons.keys)
        .isEqualTo(otherEntity.value.singletons.keys)
      assertThat(myEntity.value.collections.keys)
        .isEqualTo(otherEntity.value.collections.keys)

      myEntity.value.singletons.forEach { (field, value) ->
        val otherValue = otherEntity.value.singletons[field]
        assertThat(value?.id).isEqualTo(otherValue?.id)
      }
      myEntity.value.collections.forEach { (field, value) ->
        val otherValue = otherEntity.value.collections[field]
        assertThat(value.size).isEqualTo(otherValue?.size)
        assertThat(value.map { it.id }.toSet())
          .isEqualTo(otherValue?.map { it.id }?.toSet())
      }
    }
  }
}
