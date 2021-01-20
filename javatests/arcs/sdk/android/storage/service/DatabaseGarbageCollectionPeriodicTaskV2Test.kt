package arcs.sdk.android.storage.service

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker.Result
import androidx.work.testing.TestWorkerBuilder
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.android.util.testutil.AndroidLogRule
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SchemaRegistry
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.awaitReady
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.InlineDummyEntity
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testDatabaseStorageEndpointManager
import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchStore
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.service.testutil.TestWorkerFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class DatabaseGarbageCollectionPeriodicTaskV2Test {

  @get:Rule
  val log = AndroidLogRule()

  private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
  private val backingKey = DatabaseStorageKey.Persistent(
    "entities-backing",
    DummyEntity.SCHEMA_HASH
  )
  private val collectionKey = ReferenceModeStorageKey(
    backingKey = backingKey,
    storageKey = DatabaseStorageKey.Persistent("collection", DummyEntity.SCHEMA_HASH)
  )
  private lateinit var databaseManager: AndroidSqliteDatabaseManager
  private val fakeTime = FakeTime()
  private lateinit var worker: DatabaseGarbageCollectionPeriodicTaskV2
  private val storageEndpointManager = testDatabaseStorageEndpointManager()

  @Before
  fun setUp() {
    val app: Application = ApplicationProvider.getApplicationContext()
    databaseManager = AndroidSqliteDatabaseManager(app)
    DriverAndKeyConfigurator.configure(databaseManager)
    SchemaRegistry.register(DummyEntity.SCHEMA)
    SchemaRegistry.register(InlineDummyEntity.SCHEMA)
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
    worker = TestWorkerBuilder.from(
      app,
      DatabaseGarbageCollectionPeriodicTaskV2::class.java
    ).setWorkerFactory(TestWorkerFactory()).build() as DatabaseGarbageCollectionPeriodicTaskV2
  }

  @Test
  fun garbageCollectionWorkerTest() = runBlocking {
    // Set time in the past as only entity older than 2 days are garbage collected.
    fakeTime.millis = 1L

    val handle = createCollectionHandle()
    val entity = DummyEntity().apply {
      num = 1.0
      texts = setOf("1", "one")
      inlineEntity = InlineDummyEntity().apply {
        text = "inline"
      }
    }
    handle.dispatchStore(entity)

    // Create a reference to entity1, so that we can check the value (but don't persist the
    // reference or the entity won't be garbage collected)
    val ref1 = handle.dispatchCreateReference(entity)

    // Trigger gc worker twice (entity are removed only after being orphan for two runs).
    assertThat(worker.doWork()).isEqualTo(Result.success())
    assertThat(worker.doWork()).isEqualTo(Result.success())
    // Check that the entity is still there as it is still in the collection.
    assertThat(ref1.dereference()).isEqualTo(entity)

    // Now remove from the collection.
    handle.dispatchRemove(entity)
    assertThat(handle.dispatchFetchAll()).isEmpty()

    // Trigger gc worker twice again.
    assertThat(worker.doWork()).isEqualTo(Result.success())
    assertThat(worker.doWork()).isEqualTo(Result.success())

    // Make sure the subsequent dereference will actually hit the DB.
    storageEndpointManager.reset()

    // After the second run, the tombstone is gone.
    assertThat(ref1.dereference()).isEqualTo(null)
  }

  @Suppress("UNCHECKED_CAST")
  private suspend fun createCollectionHandle() =
    HandleManagerImpl(
      time = fakeTime,
      scheduler = schedulerProvider("test"),
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    ).createHandle(
      HandleSpec(
        "name",
        HandleMode.ReadWrite,
        CollectionType(EntityType(DummyEntity.SCHEMA)),
        DummyEntity
      ),
      collectionKey
    ).awaitReady() as ReadWriteCollectionHandle<DummyEntity>
}
