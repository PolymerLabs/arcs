package arcs.core.storage.testutil

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.crdt.testing.CrdtSetHelper
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.toReferencable
import arcs.core.storage.DriverFactory
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test

/**
 * Testing base class for [ReferenceModeStore] tests. Subclasses can override this class to run its
 * suite of tests for its own database backend.
 */
@OptIn(ExperimentalCoroutinesApi::class)
abstract class ReferenceModeStoreTestBase {
  // TODO(b/171729186): Move all tests that are shared between ReferenceModeStoreTest,
  // ReferenceModeStoreDatabaseIntegrationTest and ReferenceModeStoreDatabaseImplIntegrationTest
  // here.

  protected abstract val TEST_KEY: ReferenceModeStorageKey

  protected abstract var driverFactory: DriverFactory

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

  open fun setUp() {
    SchemaRegistry.register(SCHEMA)
    SchemaRegistry.register(INLINE_SCHEMA)
  }

  @Test
  fun driverMissing_throws() = runBlockingTest {
    driverFactory = FixedDriverFactory()
    assertFailsWith<CrdtException> { collectionReferenceModeStore(scope = this) }
  }

  @Test
  fun constructsReferenceModeStore() = runBlockingTest {
    val store = collectionReferenceModeStore(scope = this)

    assertThat(store).isInstanceOf(ReferenceModeStore::class.java)
  }

  protected suspend fun collectionReferenceModeStore(scope: CoroutineScope): ReferenceModeStore {
    return ReferenceModeStore.collectionTestStore(
      TEST_KEY,
      SCHEMA,
      scope = scope,
      driverFactory = driverFactory
    )
  }

  protected suspend fun singletonReferenceModeStore(scope: CoroutineScope): ReferenceModeStore {
    return ReferenceModeStore.singletonTestStore(
      TEST_KEY,
      SCHEMA,
      scope = scope,
      driverFactory = driverFactory
    )
  }

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
