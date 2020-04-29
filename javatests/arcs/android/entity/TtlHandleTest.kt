package arcs.android.entity

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.data.HandleMode
import arcs.core.data.Ttl
import arcs.core.entity.DummyEntity
import arcs.core.entity.Handle
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.SchemaRegistry
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.WriteBackForTesting
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class TtlHandleTest {
    @get:Rule
    val log = LogRule()

    private val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
    private val backingKey = DatabaseStorageKey.Persistent("entities-backing", DummyEntity.SCHEMA_HASH)
    private val collectionKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = DatabaseStorageKey.Persistent("collection", DummyEntity.SCHEMA_HASH)
    )
    private val singletonKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = DatabaseStorageKey.Persistent("singleton", DummyEntity.SCHEMA_HASH)
    )
    private val testScope = TestCoroutineScope(TestCoroutineDispatcher())
    private lateinit var databaseManager: AndroidSqliteDatabaseManager
    private lateinit var fakeTime: FakeTime
    private lateinit var scheduler: Scheduler
    private val handleManager: EntityHandleManager
        // Create a new handle manager on each call, to check different storage proxies.
        get() = EntityHandleManager(
            time = fakeTime,
            scheduler = scheduler
        )

    @Before
    fun setUp() {
        fakeTime = FakeTime()
        scheduler = schedulerProvider("myArc")
        databaseManager = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        WriteBackForTesting.writeBackScope = testScope
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        DriverAndKeyConfigurator.configure(databaseManager)
        SchemaRegistry.register(DummyEntity)
    }

    @After
    fun tearDown() {
        WriteBackForTesting.clear()
        scheduler.cancel()
    }

    @Test
    fun singletonWithExpiredEntities() = runBlocking {
        val handle = createSingletonHandle()
        val entity1 = DummyEntity().apply {
            num = 1.0
            texts = setOf("1", "one")
        }
        val entity2 = DummyEntity().apply {
            num = 2.0
            texts = setOf("2", "two")
        }

        // Sync the handle, then store entity1
        var readyJob = Job()
        var storeEntity1: Job? = null
        handle.onReady {
            log("handle ready")

            // Set a time in the past. So that this entity is already expired.
            fakeTime.millis = 1L

            storeEntity1 = handle.store(entity1)

            log("moving time forward")
            fakeTime.millis = System.currentTimeMillis()

            assertThat(handle.fetch()).isEqualTo(null)

            log("completing ready job")
            readyJob.complete()
        }
        readyJob.join()
        log("awaiting completiion of store job")
        storeEntity1!!.join()

        val updateJob = Job()
        handle.onUpdate {
            try {
                log("received update from databaseManager.removeExpiredEntities()")
                assertThat(handle.fetch()).isEqualTo(null)
                log("Got data")
                updateJob.complete()
                log("completed")
            } catch (e: Throwable) {
                updateJob.completeExceptionally(e)
            }
        }

        // Simulate periodic job triggering.
        log("Removing Expired Entities")
        databaseManager.removeExpiredEntities().join()
        updateJob.join()

        // Create a new handle manager with a new storage proxy to confirm entity1 is gone and the
        // singleton is still in a good state.
        log("creating handle2")
        val handle2 = createSingletonHandle()
        readyJob = Job()
        val modifications = mutableListOf<Job>()
        handle2.onReady {
            try {
                log("in handle2.onReady")
                assertThat(handle2.fetch()).isEqualTo(null)

                log("Replacing with entity 2 in handle 2.")
                modifications.add(handle2.store(entity2))
                assertThat(handle2.fetch()).isEqualTo(entity2)

                log("Clearing handle 2")
                modifications.add(handle2.clear())
                assertThat(handle2.fetch()).isNull()
                readyJob.complete()
            } catch (e: Throwable) {
                readyJob.completeExceptionally(e)
            }
        }
        readyJob.join()
        modifications.joinAll()
        log("all done")
    }

    @Test
    fun collectionWithExpiredEntities() = runBlocking {
        val handle = createCollectionHandle()
        val entity1 = DummyEntity().apply {
            num = 1.0
            texts = setOf("1", "one")
        }
        val entity2 = DummyEntity().apply {
            num = 2.0
            texts = setOf("2", "two")
        }
        val entity3 = DummyEntity().apply {
            num = 3.0
            texts = setOf("3", "three")
        }
        val entity4 = DummyEntity().apply {
            num = 4.0
            texts = setOf("4", "four")
        }

        var readyJob = Job()
        val activeWrites = mutableListOf<Job>()
        handle.onReady {
            log("handle.onReady called.")
            // Set a time in the past. So that this entity is already expired.
            fakeTime.millis = 1L
            log("handle.store(entity1)")
            activeWrites.add(handle.store(entity1))

            // Then set time to now and add another entity - not expired.
            fakeTime.millis = System.currentTimeMillis()
            log("handle.store(entity2)")
            activeWrites.add(handle.store(entity2))

            try {
                // TODO(b/152361041): after expired entities are filtered out on read, this should
                //  only contain entity2.
                log("handle should contain entity1 and entity 2 for now")
                assertThat(handle.fetchAll()).containsExactly(entity1, entity2)
                readyJob.complete()
            } catch (e: Throwable) {
                readyJob.completeExceptionally(e)
            }
        }
        log(
            "OnReady listener set up, waiting for it to get called, as well as for the " +
                "completion of the writes it triggers."
        )
        readyJob.join()
        log("OnReady finished.")
        activeWrites.joinAll()
        log("Writes finished.")
        activeWrites.clear()

        log("Initial writes completed, now we're going to to remove expired entities.")

        val updateJob = Job()
        handle.onUpdate {
            try {
                assertThat(handle.fetchAll()).containsExactly(entity2)

                activeWrites.add(handle.store(entity3))
                assertThat(handle.fetchAll()).containsExactly(entity2, entity3)

                updateJob.complete()
            } catch (e: Throwable) {
                updateJob.completeExceptionally(e)
            }
        }

        // Simulate periodic job triggering.
        log("removing expired entities")
        databaseManager.removeExpiredEntities().join()
        updateJob.join()
        activeWrites.joinAll()
        activeWrites.clear()

        // Create a new handle manager with a new storage proxy to confirm entity1 is gone and the
        // collection is still in a good state.
        val handle2 = createCollectionHandle()
        readyJob = Job()
        handle2.onReady {
            try {
                assertThat(handle2.fetchAll()).containsExactly(entity2, entity3)

                activeWrites.add(handle2.store(entity4))
                assertThat(handle2.fetchAll()).containsExactly(entity2, entity3, entity4)
                readyJob.complete()
            } catch (e: Throwable) {
                readyJob.completeExceptionally(e)
            }
        }
        readyJob.join()
        activeWrites.joinAll()
    }

    @Test
    fun sameEntityInTwoCollections() = runBlocking {
        val entity1 = DummyEntity().apply { num = 1.0 }
        val entity2 = DummyEntity().apply { num = 2.0 }
        val entity3 = DummyEntity().apply { num = 3.0 }
        val entity4 = DummyEntity().apply { num = 4.0 }

        val handle1 = createCollectionHandle(Ttl.Minutes(1))
        val handle1ReadyJob = Job()
        val activeWrites = mutableListOf<Job>()
        handle1.onReady { handle1ReadyJob.complete() }
        // A separate collection with the same backing store.
        val collectionKey2 = ReferenceModeStorageKey(
            backingKey = backingKey,
            storageKey = DatabaseStorageKey.Persistent("collection2", DummyEntity.SCHEMA_HASH)
        )
        val handle2 = createCollectionHandle(Ttl.Minutes(2), collectionKey2)
        val handle2ReadyJob = Job()
        handle2.onReady { handle2ReadyJob.complete() }

        // Insert at time now-90seconds. So all entities in handle1 will be expired, those in
        // handle2 are still alive.
        fakeTime.millis = System.currentTimeMillis() - 90_000

        handle1ReadyJob.join()
        handle2ReadyJob.join()

        withContext(handle1.dispatcher) {
            activeWrites.add(handle1.store(entity1))
            activeWrites.add(handle1.store(entity2))
        }
        activeWrites.joinAll()
        activeWrites.clear()

        withContext(handle2.dispatcher) {
            activeWrites.add(handle2.store(entity1))
            activeWrites.add(handle2.store(entity3))
            activeWrites.add(handle2.store(entity4))
        }
        activeWrites.joinAll()
        activeWrites.clear()

        withContext(handle1.dispatcher) {
            activeWrites.add(handle1.store(entity4))
        }
        activeWrites.joinAll()
        activeWrites.clear()

        scheduler.waitForIdle()

        val onUpdateJob1 = Job()
        handle1.onUpdate {
            try {
                // Entity4 is present because it was first stored through handle2.
                assertThat(handle1.fetchAll()).containsExactly(entity4)
                onUpdateJob1.complete()
            } catch (e: Throwable) {
                onUpdateJob1.completeExceptionally(e)
            }
        }

        val onUpdateJob2 = Job()
        handle2.onUpdate {
            try {
                // Entity1 is gone because it was first stored through handle1.
                assertThat(handle2.fetchAll()).containsExactly(entity3, entity4)
                onUpdateJob2.complete()
            } catch (e: Throwable) {
                onUpdateJob2.completeExceptionally(e)
            }
        }

        // Simulate periodic job triggering.
        databaseManager.removeExpiredEntities().join()

        onUpdateJob1.join()
        onUpdateJob2.join()
    }

    @Test
    fun handleWithTtlNoExpiredEntities() = runBlocking {
        val entity1 = DummyEntity().apply { num = 1.0 }
        val entity2 = DummyEntity().apply { num = 2.0 }

        // Note: this tests a handle configured with TTL (thus entities have an expiry time).
        val handle1 = createCollectionHandle()
        val handle2 = createSingletonHandle()

        // Store at time now, so entities are not expired.
        fakeTime.millis = System.currentTimeMillis()

        handle1.store(entity1)
        handle2.store(entity2)

        // Simulate periodic job triggering.
        databaseManager.removeExpiredEntities()

        assertThat(handle1.fetchAll()).containsExactly(entity1)
        assertThat(handle2.fetch()).isEqualTo(entity2)
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun createCollectionHandle(
        ttl: Ttl = Ttl.Hours(1),
        key: StorageKey = collectionKey
    ) = handleManager.createHandle(
        HandleSpec(
            "name",
            HandleMode.ReadWrite,
            HandleContainerType.Collection,
            DummyEntity
        ),
        key,
        ttl
    ).awaitReady() as ReadWriteCollectionHandle<DummyEntity>

    @Suppress("UNCHECKED_CAST")
    private suspend fun createSingletonHandle() =
        handleManager.createHandle(
            HandleSpec(
                "name",
                HandleMode.ReadWrite,
                HandleContainerType.Singleton,
                DummyEntity
            ),
            singletonKey,
            Ttl.Hours(1)
        ).awaitReady() as ReadWriteSingletonHandle<DummyEntity>
}
