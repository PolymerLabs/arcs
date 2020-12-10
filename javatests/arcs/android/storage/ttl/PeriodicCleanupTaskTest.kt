package arcs.android.storage.ttl

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker.Result
import androidx.work.testing.TestWorkerBuilder
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.data.Capability.Ttl
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
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.jvm.util.JvmTime
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class PeriodicCleanupTaskTest {
  private val collectionKey = ReferenceModeStorageKey(
    backingKey = DatabaseStorageKey.Persistent("backing", DummyEntity.SCHEMA_HASH),
    storageKey = DatabaseStorageKey.Persistent("collection", DummyEntity.SCHEMA_HASH)
  )
  private val fakeTime = FakeTime()
  private lateinit var worker: PeriodicCleanupTask
  private val context: Context = ApplicationProvider.getApplicationContext()

  @Before
  fun setUp() {
    SchemaRegistry.register(DummyEntity.SCHEMA)
    SchemaRegistry.register(InlineDummyEntity.SCHEMA)
    worker = TestWorkerBuilder.from(context, PeriodicCleanupTask::class.java).build()
  }

  @Test
  fun ttlWorker_removesExpiredEntity() = runBlocking {
    DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(context))
    // Set time in the past so entity is already expired.
    fakeTime.millis = 1L

    val handle = createCollectionHandle()
    val entity = DummyEntity().apply {
      num = 1.0
      inlineEntity = InlineDummyEntity().apply {
        text = "inline"
      }
    }
    handle.dispatchStore(entity)

    assertThat(handle.dispatchFetchAll()).containsExactly(entity)

    // Trigger worker.
    assertThat(worker.doWork()).isEqualTo(Result.success())

    // Verify entity is gone.
    assertThat(handle.dispatchFetchAll()).isEmpty()
  }

  @Test
  fun ttlWorker_doestNotRemoveNonExpiredInlineEntity() = runBlocking {
    DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(context))
    // Set time to now, so entity is NOT expired.
    fakeTime.millis = JvmTime.currentTimeMillis

    val handle = createCollectionHandle()
    val entity = DummyEntity().apply {
      num = 1.0
      inlineEntity = InlineDummyEntity().apply { text = "inline" }
      inlines = setOf(
        InlineDummyEntity().apply { text = "C1" },
        InlineDummyEntity().apply { text = "C2" }
      )
    }
    handle.dispatchStore(entity)

    // Trigger worker.
    assertThat(worker.doWork()).isEqualTo(Result.success())

    // Verify entity is still there. Recreate the handle to make sure the entity is read
    // from the database rather than an in-memory copy.
    assertThat(createCollectionHandle().dispatchFetchAll()).containsExactly(entity)
    Unit
  }

  @Test
  fun ttlWorker_resetDatabaseWhenTooLarge() = runBlocking {
    DriverAndKeyConfigurator.configure(
      AndroidSqliteDatabaseManager(context, maxDbSizeBytes = 5)
    )
    // Set time to now, so entity is NOT expired.
    fakeTime.millis = JvmTime.currentTimeMillis

    val handle = createCollectionHandle()
    val entity = DummyEntity().apply { num = 1.0 }
    handle.dispatchStore(entity)
    assertThat(handle.dispatchFetchAll()).containsExactly(entity)

    // Trigger worker.
    assertThat(worker.doWork()).isEqualTo(Result.success())

    // Verify entity is gone even though it was not expired.
    assertThat(handle.dispatchFetchAll()).isEmpty()
  }

  @Suppress("UNCHECKED_CAST")
  private suspend fun createCollectionHandle() =
    HandleManagerImpl(
      time = fakeTime,
      scheduler = SimpleSchedulerProvider(Dispatchers.Default)("test"),
      storageEndpointManager = testDatabaseStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    ).createHandle(
      HandleSpec(
        "name",
        HandleMode.ReadWrite,
        CollectionType(EntityType(DummyEntity.SCHEMA)),
        DummyEntity
      ),
      collectionKey,
      Ttl.Days(2)
    ).awaitReady() as ReadWriteCollectionHandle<DummyEntity>
}
