package arcs.core.crdt.testing

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Ignore
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
  fun update_sameSingletonField_updatesSingletonValue() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.update(SINGLETON_FIELD1, REFERENCE1)
    assertThat(entity.consumerView.singletons[SINGLETON_FIELD1]).isEqualTo(REFERENCE1)

    helper.update(SINGLETON_FIELD1, REFERENCE2)
    assertThat(entity.consumerView.singletons[SINGLETON_FIELD1]).isEqualTo(REFERENCE2)
  }

  @Test
  fun update_sameSingletonField_incrementsVersionMap() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.update(SINGLETON_FIELD1, REFERENCE1)
    helper.update(SINGLETON_FIELD1, REFERENCE2)

    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 2))
    assertThat(getSingletonVersionMaps(entity)).containsExactly(
      SINGLETON_FIELD1, VersionMap(ACTOR to 2),
      SINGLETON_FIELD2, VersionMap()
    )
  }

  @Test
  fun update_differentSingletonFields_updatesSingletonValue() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.update(SINGLETON_FIELD1, REFERENCE1)
    helper.update(SINGLETON_FIELD2, REFERENCE2)

    assertThat(entity.consumerView.singletons).containsExactly(
      SINGLETON_FIELD1, REFERENCE1,
      SINGLETON_FIELD2, REFERENCE2
    )
  }

  @Test
  fun update_differentSingletonFields_incrementsVersionMap() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.update(SINGLETON_FIELD1, REFERENCE1)
    helper.update(SINGLETON_FIELD2, REFERENCE2)

    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))
    assertThat(getSingletonVersionMaps(entity)).containsExactly(
      SINGLETON_FIELD1, VersionMap(ACTOR to 1),
      SINGLETON_FIELD2, VersionMap(ACTOR to 1)
    )
  }

  @Test
  fun clearSingleton_clearsSingletonValue() {
    val helper = CrdtEntityHelper(ACTOR, entity)
    helper.update(SINGLETON_FIELD1, REFERENCE1)

    helper.clearSingleton(SINGLETON_FIELD1)

    assertThat(entity.consumerView.singletons[SINGLETON_FIELD1]).isNull()
  }

  @Test
  fun clearSingleton_doesNotIncrementVersionMap() {
    val helper = CrdtEntityHelper(ACTOR, entity)
    helper.update(SINGLETON_FIELD1, REFERENCE1)

    helper.clearSingleton(SINGLETON_FIELD1)

    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))
    assertThat(
      getSingletonVersionMaps(entity)[SINGLETON_FIELD1]
    ).isEqualTo(VersionMap(ACTOR to 1))
  }

  @Test
  fun add_addsElementToCollection() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.add(COLLECTION_FIELD1, REFERENCE1)
    assertThat(entity.consumerView.collections[COLLECTION_FIELD1]).containsExactly(REFERENCE1)

    helper.add(COLLECTION_FIELD1, REFERENCE2)
    assertThat(entity.consumerView.collections[COLLECTION_FIELD1]).containsExactly(
      REFERENCE1,
      REFERENCE2
    )
  }

  @Test
  fun add_incrementsVersionMap() {
    val helper = CrdtEntityHelper(ACTOR, entity)

    helper.add(COLLECTION_FIELD1, REFERENCE1)
    helper.add(COLLECTION_FIELD1, REFERENCE2)

    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 2))
    assertThat(
      getCollectionVersionMaps(entity)[COLLECTION_FIELD1]
    ).isEqualTo(VersionMap(ACTOR to 2))
  }

  @Test
  fun remove_removesElementFromCollection() {
    val helper = CrdtEntityHelper(ACTOR, entity)
    helper.add(COLLECTION_FIELD1, REFERENCE1)

    helper.remove(COLLECTION_FIELD1, REFERENCE1.id)

    assertThat(entity.consumerView.collections[COLLECTION_FIELD1]).isEmpty()
  }

  @Test
  fun remove_doesNotIncrementVersionMap() {
    val helper = CrdtEntityHelper(ACTOR, entity)
    helper.add(COLLECTION_FIELD1, REFERENCE1)

    helper.remove(COLLECTION_FIELD1, REFERENCE1.id)

    assertThat(entity.versionMap).isEqualTo(VersionMap(ACTOR to 1))
    assertThat(
      getCollectionVersionMaps(entity)[COLLECTION_FIELD1]
    ).isEqualTo(VersionMap(ACTOR to 1))
  }

  @Ignore("b/175657591 - Bug in CrdtEntity ClearAll operation")
  @Test
  fun clearAll() {
    val helper = CrdtEntityHelper(ACTOR, entity)
    // Add many elements, all at difference versions.
    helper.update(SINGLETON_FIELD1, REFERENCE1)
    helper.update(SINGLETON_FIELD1, REFERENCE2)
    helper.update(SINGLETON_FIELD1, REFERENCE1)
    helper.update(SINGLETON_FIELD1, REFERENCE2)
    helper.add(COLLECTION_FIELD1, REFERENCE1)
    helper.add(COLLECTION_FIELD1, REFERENCE2)

    helper.clearAll()

    assertThat(entity.consumerView.singletons[SINGLETON_FIELD1]).isNull()
    assertThat(entity.consumerView.singletons[SINGLETON_FIELD2]).isNull()
    assertThat(entity.consumerView.collections[COLLECTION_FIELD1]).isEmpty()
    assertThat(entity.consumerView.collections[COLLECTION_FIELD2]).isEmpty()
  }

  private companion object {
    private const val ACTOR = "ACTOR"
    private const val SINGLETON_FIELD1 = "SINGLETON_FIELD1"
    private const val SINGLETON_FIELD2 = "SINGLETON_FIELD2"
    private const val COLLECTION_FIELD1 = "COLLECTION_FIELD1"
    private const val COLLECTION_FIELD2 = "COLLECTION_FIELD2"
    private val REFERENCE1 = CrdtEntity.ReferenceImpl(1.toReferencable().id)
    private val REFERENCE2 = CrdtEntity.ReferenceImpl(2.toReferencable().id)

    /** Returns a map from field name to [VersionMap] for each singleton field in [entity]. */
    private fun getSingletonVersionMaps(entity: CrdtEntity): Map<String, VersionMap> {
      return entity.data.singletons.mapValues { it.value.versionMap }
    }

    /** Returns a map from field name to [VersionMap] for each collection field in [entity]. */
    private fun getCollectionVersionMaps(entity: CrdtEntity): Map<String, VersionMap> {
      return entity.data.collections.mapValues { it.value.versionMap }
    }
  }
}
