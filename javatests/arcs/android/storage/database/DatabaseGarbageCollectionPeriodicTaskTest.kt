package arcs.android.storage.database

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker.Result
import androidx.work.testing.TestWorkerBuilder
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SchemaRegistry
import arcs.core.entity.DummyEntity
import arcs.core.entity.HandleSpec
import arcs.core.entity.InlineDummyEntity
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StoreManager
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchStore
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class DatabaseGarbageCollectionPeriodicTaskTest {
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
    private lateinit var worker: DatabaseGarbageCollectionPeriodicTask
    private val stores = StoreManager()

    @Before
    fun setUp() {
        databaseManager = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        DriverAndKeyConfigurator.configure(databaseManager)
        SchemaRegistry.register(DummyEntity.SCHEMA)
        SchemaRegistry.register(InlineDummyEntity.SCHEMA)
        worker = TestWorkerBuilder.from(
            ApplicationProvider.getApplicationContext(),
            DatabaseGarbageCollectionPeriodicTask::class.java
        ).build()
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
        stores.reset()

        // After the second run, the tombstone is gone.
        assertThat(ref1.dereference()).isEqualTo(null)
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun createCollectionHandle() =
        EntityHandleManager(
            time = fakeTime,
            scheduler = schedulerProvider("test"),
            storageEndpointManager = DirectStorageEndpointManager(stores)
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
