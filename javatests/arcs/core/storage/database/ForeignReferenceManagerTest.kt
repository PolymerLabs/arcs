package arcs.core.storage.database

import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.keys.ForeignStorageKey
import arcs.jvm.storage.database.testutil.FakeDatabase
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ForeignReferenceManagerTest {

  private val dbManager = FakeDatabaseManager()
  private val foreignReferenceManager = ForeignReferenceManager(dbManager)

  private val schema = Schema(
    setOf(SchemaName("foreignSchema")),
    SchemaFields.EMPTY,
    "hash"
  )

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
}
