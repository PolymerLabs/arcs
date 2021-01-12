package arcs.sdk.android.storage.service

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.crdt.toProto
import arcs.core.crdt.CrdtException
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.ForeignStorageKey
import arcs.jvm.storage.database.testutil.FakeDatabase
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class StorageServiceManagerEndpointTest {

  private lateinit var app: Application
  private val SCHEMA_NAME = "name"
  private val SCHEMA_NAME2 = "name2"
  private val schema = Schema(
    setOf(SchemaName(SCHEMA_NAME)),
    SchemaFields.EMPTY,
    "hash"
  )
  private val schema2 = Schema(
    setOf(SchemaName(SCHEMA_NAME2)),
    SchemaFields.EMPTY,
    "hash"
  )
  private val dbManager = FakeDatabaseManager()
  private lateinit var database: FakeDatabase

  @Before
  fun setUp() = runBlocking {
    app = ApplicationProvider.getApplicationContext()
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
    // Install fake dbManager and create one database.
    DriverAndKeyConfigurator.configure(dbManager)
    database = dbManager.getDatabase("db", true) as FakeDatabase
  }

  @Test
  fun triggerForeignHardReferenceDeletion_propagatesToDatabase() = runBlocking {
    val testBindHelper = TestBindHelper(app)
    val endpoint = StorageServiceManagerEndpoint(testBindHelper, this@runBlocking)

    endpoint.triggerForeignHardReferenceDeletion(schema, "id")

    assertThat(database.hardReferenceDeletes).containsExactly(
      ForeignStorageKey(SCHEMA_NAME) to "id"
    )
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }

  @Test
  fun triggerForeignHardReferenceDeletion_sequenceOfCalls() = runBlocking {
    val testBindHelper = TestBindHelper(app)
    val endpoint = StorageServiceManagerEndpoint(testBindHelper, this@runBlocking)
    assertThat(database.hardReferenceDeletes).isEmpty()

    endpoint.triggerForeignHardReferenceDeletion(schema, "id")
    endpoint.triggerForeignHardReferenceDeletion(schema, "id2")
    endpoint.triggerForeignHardReferenceDeletion(schema2, "id")
    endpoint.triggerForeignHardReferenceDeletion(schema, "id")

    assertThat(database.hardReferenceDeletes).containsExactly(
      ForeignStorageKey(SCHEMA_NAME) to "id",
      ForeignStorageKey(SCHEMA_NAME) to "id2",
      ForeignStorageKey(SCHEMA_NAME2) to "id",
      ForeignStorageKey(SCHEMA_NAME) to "id"
    )
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }

  @Test
  fun reconcileForeignHardReference_deletesOne() = runBlocking {
    val testBindHelper = TestBindHelper(app)
    val endpoint = StorageServiceManagerEndpoint(testBindHelper, this@runBlocking)
    database.allHardReferenceIds.add("id1")

    endpoint.reconcileForeignHardReference(schema, setOf("id2"))

    assertThat(database.hardReferenceDeletes).containsExactly(
      ForeignStorageKey(SCHEMA_NAME) to "id1"
    )
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }

  @Test
  fun reconcileForeignHardReference_partialOvelap() = runBlocking {
    val testBindHelper = TestBindHelper(app)
    val endpoint = StorageServiceManagerEndpoint(testBindHelper, this@runBlocking)
    database.allHardReferenceIds.addAll(listOf("id1", "id2"))

    endpoint.reconcileForeignHardReference(schema, setOf("id2"))

    assertThat(database.hardReferenceDeletes).containsExactly(
      ForeignStorageKey(SCHEMA_NAME) to "id1"
    )
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }

  @Test
  fun reconcileForeignHardReference_deletesNone() = runBlocking {
    val testBindHelper = TestBindHelper(app)
    val endpoint = StorageServiceManagerEndpoint(testBindHelper, this@runBlocking)
    database.allHardReferenceIds.add("id1")

    endpoint.reconcileForeignHardReference(schema, setOf("id1"))

    assertThat(database.hardReferenceDeletes).isEmpty()
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }

  @Test
  fun reconcileForeignHardReference_emptyValidSet() = runBlocking {
    val testBindHelper = TestBindHelper(app)
    val endpoint = StorageServiceManagerEndpoint(testBindHelper, this@runBlocking)
    database.allHardReferenceIds.add("id1")

    endpoint.reconcileForeignHardReference(schema, emptySet())

    assertThat(database.hardReferenceDeletes).containsExactly(
      ForeignStorageKey(SCHEMA_NAME) to "id1"
    )
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }

  @Test
  fun runIResultCallbackOnStorageServiceManager_success() = runBlocking {
    val testBindHelper = TestBindHelper(app)
    val endpoint = StorageServiceManagerEndpoint(testBindHelper, this@runBlocking)
    var called = false

    endpoint.runIResultCallbackOnStorageServiceManager { _, callback ->
      called = true
      callback.onResult(null)
    }

    assertThat(called).isTrue()
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }

  @Test
  fun runIResultCallbackOnStorageServiceManager_fail() = runBlocking {
    val testBindHelper = TestBindHelper(app)
    val endpoint = StorageServiceManagerEndpoint(testBindHelper, this@runBlocking)
    var called = false

    val e = assertFailsWith<CrdtException> {
      endpoint.runIResultCallbackOnStorageServiceManager { _, callback ->
        called = true
        callback.onResult(CrdtException("message").toProto().toByteArray())
      }
    }

    assertThat(e.message).isEqualTo("message")
    assertThat(called).isTrue()
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }
}
