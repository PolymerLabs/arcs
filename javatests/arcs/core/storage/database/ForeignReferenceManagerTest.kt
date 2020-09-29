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
  fun methodUnderTest_expectedResult() = runBlockingTest {
    val db = dbManager.getDatabase("db", true) as FakeDatabase

    foreignReferenceManager.triggerDatabaseDeletion(
      schema,
      "id"
    )

    assertThat(db.hardReferenceDeletes).containsExactly(ForeignStorageKey("foreignSchema") to "id")
  }
}
