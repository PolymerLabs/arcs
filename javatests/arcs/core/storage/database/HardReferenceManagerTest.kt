package arcs.core.storage.database

import arcs.core.storage.keys.ForeignStorageKey
import arcs.jvm.storage.database.testutil.FakeDatabase
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class HardReferenceManagerTest {

  private val dbManager = FakeDatabaseManager()
  private val hardReferenceManager = HardReferenceManager(dbManager)
  private val storageKey = ForeignStorageKey("foreignSchema")

  @Test
  fun triggerDatabaseDeletion() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase

    hardReferenceManager.triggerDatabaseDeletion(storageKey, "id")

    assertThat(db.hardReferenceDeletes).containsExactly(storageKey to "id")
  }

  @Test
  fun reconcile_removesMissingIds() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase
    db.allHardReferenceIds.addAll(setOf("id1", "id2"))

    hardReferenceManager.reconcile(storageKey, setOf("id1", "id3"))

    assertThat(db.hardReferenceDeletes).containsExactly(storageKey to "id2")
  }

  @Test
  fun reconcile_allIds() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase
    db.allHardReferenceIds.addAll(setOf("id1", "id2"))

    hardReferenceManager.reconcile(storageKey, setOf("id1", "id2"))

    assertThat(db.hardReferenceDeletes).isEmpty()
  }

  @Test
  fun reconcile_noDbIds() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase

    hardReferenceManager.reconcile(storageKey, setOf("id1"))

    assertThat(db.hardReferenceDeletes).isEmpty()
  }

  @Test
  fun reconcile_fullSetEmpty() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase
    db.allHardReferenceIds.addAll(setOf("id1", "id2"))

    hardReferenceManager.reconcile(storageKey, setOf())

    assertThat(db.hardReferenceDeletes).containsExactly(
      storageKey to "id1",
      storageKey to "id2"
    )
  }
}
