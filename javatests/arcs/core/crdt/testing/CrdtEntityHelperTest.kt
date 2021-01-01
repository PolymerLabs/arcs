package arcs.core.crdt.testing

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CrdtEntityHelperTest {
  private lateinit var entity: CrdtEntity

  @Before
  fun setUp() {
    entity = CrdtEntity(
      VersionMap(),
      RawEntity(
        singletonFields = setOf(SINGLETON_FIELD1, SINGLETON_FIELD2),
        collectionFields = setOf(COLLECTION_FIELD1)
      )
    )
  }

  @Test
  fun update_sameSingletonField() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.update(SINGLETON_FIELD1, REFERENCE1)
    assertThat(entity.consumerView.singletons[SINGLETON_FIELD1]).isEqualTo(REFERENCE1)
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))

    helper.update(SINGLETON_FIELD1, REFERENCE2)
    assertThat(entity.consumerView.singletons[SINGLETON_FIELD1]).isEqualTo(REFERENCE2)
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 2))
  }

  @Test
  fun update_differentSingletonFields() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.update(SINGLETON_FIELD1, REFERENCE1)
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))

    helper.update(SINGLETON_FIELD2, REFERENCE2)
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 2))

    assertThat(entity.consumerView.singletons).containsExactly(
      SINGLETON_FIELD1, REFERENCE1,
      SINGLETON_FIELD2, REFERENCE2
    )
  }

  @Test
  fun clearSingleton() {
    val helper = CrdtEntityHelper(ACTOR, entity)
    helper.update(SINGLETON_FIELD1, REFERENCE1)
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))

    helper.clearSingleton(SINGLETON_FIELD1)

    assertThat(entity.consumerView.singletons[SINGLETON_FIELD1]).isNull()
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))
  }

  @Test
  fun addToCollection() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.add(COLLECTION_FIELD1, REFERENCE1)
    assertThat(entity.consumerView.collections[COLLECTION_FIELD1]).containsExactly(REFERENCE1)
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))

    helper.add(COLLECTION_FIELD1, REFERENCE2)
    assertThat(entity.consumerView.collections[COLLECTION_FIELD1]).containsExactly(
      REFERENCE1,
      REFERENCE2
    )
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 2))
  }

  @Test
  fun removeFromCollection() {
    val helper = CrdtEntityHelper(ACTOR, entity)
    helper.add(COLLECTION_FIELD1, REFERENCE1)
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))

    helper.remove(COLLECTION_FIELD1, REFERENCE1.id)

    assertThat(entity.consumerView.collections[COLLECTION_FIELD1]).isEmpty()
    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))
  }

  @Test
  fun clearAll() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    // For both singletons and collections: populate one the fields, leave the other unset.
    helper.update(SINGLETON_FIELD1, REFERENCE1)
    helper.update(SINGLETON_FIELD1, REFERENCE2)
    helper.add(COLLECTION_FIELD1, REFERENCE1)
    helper.add(COLLECTION_FIELD1, REFERENCE2)

    helper.clearAll()

    assertThat(entity.consumerView.singletons[SINGLETON_FIELD1]).isNull()
    assertThat(entity.consumerView.singletons[SINGLETON_FIELD2]).isNull()
    assertThat(entity.consumerView.collections[COLLECTION_FIELD1]).isEmpty()
    assertThat(entity.consumerView.collections[COLLECTION_FIELD2]).isNull()
  }

  private companion object {
    private const val ACTOR = "ACTOR"
    private const val SINGLETON_FIELD1 = "SINGLETON_FIELD1"
    private const val SINGLETON_FIELD2 = "SINGLETON_FIELD2"
    private const val COLLECTION_FIELD1 = "COLLECTION_FIELD1"
    private const val COLLECTION_FIELD2 = "COLLECTION_FIELD2"
    private val REFERENCE1 = CrdtEntity.ReferenceImpl(1.toReferencable().id)
    private val REFERENCE2 = CrdtEntity.ReferenceImpl(2.toReferencable().id)
  }
}
