package arcs.android.storage.ttl

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker.Result
import androidx.work.testing.TestWorkerBuilder
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.Capability.Ttl
import arcs.core.entity.DummyEntity
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.data.SchemaRegistry
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.WriteBackForTesting
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.EmptyCoroutineContext
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
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        worker = TestWorkerBuilder.from(context, PeriodicCleanupTask::class.java).build()
    }

    @Test
    fun ttlWorker_removesExpiredEntity() = runBlocking {
        DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(context))
        // Set time in the past so entity is already expired.
        fakeTime.millis = 1L

        val handle = createCollectionHandle()
        val entity = DummyEntity().apply { num = 1.0 }
        handle.dispatchStore(entity)

        // Make sure the write has reached storage.
        WriteBackForTesting.awaitAllIdle()

        assertThat(handle.dispatchFetchAll()).containsExactly(entity)

        // Trigger worker.
        assertThat(worker.doWork()).isEqualTo(Result.success())

        // Verify entity is gone.
        assertThat(handle.dispatchFetchAll()).isEmpty()
    }

    @Test
    fun ttlWorker_resetDatabaseWhenTooLarge() = runBlocking {
        DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(context, null, 5 /* maxDbSize */))
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
        EntityHandleManager(
            time = fakeTime,
            scheduler = JvmSchedulerProvider(EmptyCoroutineContext)("test")
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
