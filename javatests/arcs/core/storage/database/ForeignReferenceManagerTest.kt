package arcs.core.storage.database

import arcs.core.analytics.Analytics
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.ForeignStorageKey
import arcs.jvm.storage.database.testutil.FakeDatabase
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.Mockito.times
import org.mockito.MockitoAnnotations

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ForeignReferenceManagerTest {

  @Mock
  private lateinit var mockAnalytics: Analytics
  private lateinit var foreignReferenceManager: ForeignReferenceManager

  private var persistentEntitiesCountBefore = 0L
  private var persistentEntitiesCountAfter = 0L
  private var nonPersistentEntitiesCountBefore = 0L
  private var nonPersistentEntitiesCountAfter = 0L
  private var deletionTriggered = false

  private val dbManager = object : FakeDatabaseManager() {
    override suspend fun getEntitiesCount(persistent: Boolean): Long {
      return if (!deletionTriggered) {
        if (persistent) {
          persistentEntitiesCountBefore
        } else {
          nonPersistentEntitiesCountBefore
        }
      } else {
        if (persistent) {
          persistentEntitiesCountAfter
        } else {
          nonPersistentEntitiesCountAfter
        }
      }
    }

    override suspend fun removeEntitiesHardReferencing(
      backingStorageKey: StorageKey,
      entityId: String
    ) {
      deletionTriggered = true
      super.removeEntitiesHardReferencing(backingStorageKey, entityId)
    }

    override suspend fun getAllHardReferenceIds(backingStorageKey: StorageKey): Set<String> {
      deletionTriggered = true
      return super.getAllHardReferenceIds(backingStorageKey)
    }

  }

  private val schema = Schema(
    setOf(SchemaName("foreignSchema")),
    SchemaFields.EMPTY,
    "hash"
  )

  @Before
  fun setup() {
    MockitoAnnotations.initMocks(this)
    foreignReferenceManager = ForeignReferenceManager(dbManager, mockAnalytics)
  }

  @Test
  fun triggerDatabaseDeletion() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase

    foreignReferenceManager.triggerDatabaseDeletion(
      schema,
      "id"
    )

    assertThat(db.hardReferenceDeletes).containsExactly(ForeignStorageKey("foreignSchema") to "id")
  }

  @Test
  fun reconcile_removesMissingIds() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase
    db.allHardReferenceIds.addAll(setOf("id1", "id2"))

    foreignReferenceManager.reconcile(
      schema,
      setOf("id1", "id3")
    )

    assertThat(db.hardReferenceDeletes)
      .containsExactly(ForeignStorageKey("foreignSchema") to "id2")
  }

  @Test
  fun reconcile_allIds() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase
    db.allHardReferenceIds.addAll(setOf("id1", "id2"))

    foreignReferenceManager.reconcile(
      schema,
      setOf("id1", "id2")
    )

    assertThat(db.hardReferenceDeletes).isEmpty()
  }

  @Test
  fun reconcile_noDbIds() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase

    foreignReferenceManager.reconcile(
      schema,
      setOf("id1")
    )

    assertThat(db.hardReferenceDeletes).isEmpty()
  }

  @Test
  fun reconcile_fullSetEmpty() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase
    db.allHardReferenceIds.addAll(setOf("id1", "id2"))

    foreignReferenceManager.reconcile(
      schema,
      setOf()
    )

    assertThat(db.hardReferenceDeletes).containsExactly(
      ForeignStorageKey("foreignSchema") to "id1",
      ForeignStorageKey("foreignSchema") to "id2"
    )
  }

  @Test
  fun logDatabaseDeletion() = runBlockingTest {
    deletionTriggered = false
    persistentEntitiesCountBefore = 5
    nonPersistentEntitiesCountBefore = 6
    persistentEntitiesCountAfter = 1
    nonPersistentEntitiesCountAfter = 2

    foreignReferenceManager.triggerDatabaseDeletion(
      schema,
      "id",
      "source"
    )

    verify(mockAnalytics, times(1)).logDeletionPropagationTrigger(8L, "source")
    verifyNoMoreInteractions(mockAnalytics)
  }

  @Test
  fun logDatabaseDeletion_nullSource() = runBlockingTest {
    deletionTriggered = false
    persistentEntitiesCountBefore = 5
    nonPersistentEntitiesCountBefore = 6
    persistentEntitiesCountAfter = 1
    nonPersistentEntitiesCountAfter = 2

    foreignReferenceManager.triggerDatabaseDeletion(
      schema,
      "id"
    )

    verify(mockAnalytics, times(1)).logDeletionPropagationTrigger(8L, null)
    verifyNoMoreInteractions(mockAnalytics)
  }

  @Test
  fun logDatabaseReconcile() = runBlockingTest {
    deletionTriggered = false
    persistentEntitiesCountBefore = 7
    nonPersistentEntitiesCountBefore = 8
    persistentEntitiesCountAfter = 4
    nonPersistentEntitiesCountAfter = 5

    val db = dbManager.getDatabase("db", true) as FakeDatabase
    db.allHardReferenceIds.addAll(setOf("id1", "id2"))

    foreignReferenceManager.reconcile(
      schema,
      setOf("id1", "id2"),
      "source"
    )

    verify(mockAnalytics, times(1)).logDeletionPropagationReconcile(6L, "source")
    verifyNoMoreInteractions(mockAnalytics)
  }

  @Test
  fun logDatabaseReconcile_nullSource() = runBlockingTest {
    deletionTriggered = false
    persistentEntitiesCountBefore = 7
    nonPersistentEntitiesCountBefore = 8
    persistentEntitiesCountAfter = 4
    nonPersistentEntitiesCountAfter = 5

    val db = dbManager.getDatabase("db", true) as FakeDatabase
    db.allHardReferenceIds.addAll(setOf("id1", "id2"))

    foreignReferenceManager.reconcile(
      schema,
      setOf("id1", "id2")
    )

    verify(mockAnalytics, times(1)).logDeletionPropagationReconcile(6L, null)
    verifyNoMoreInteractions(mockAnalytics)
  }
}
