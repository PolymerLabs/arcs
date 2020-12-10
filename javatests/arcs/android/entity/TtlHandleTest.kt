package arcs.android.entity

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.awaitReady
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.InlineDummyEntity
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class TtlHandleTest {
  @get:Rule
  val log = LogRule()

  private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
  private val backingKey = DatabaseStorageKey.Persistent(
    "entities-backing",
    DummyEntity.SCHEMA_HASH
  )
  private val collectionKey = ReferenceModeStorageKey(
    backingKey = backingKey,
    storageKey = DatabaseStorageKey.Persistent("collection", DummyEntity.SCHEMA_HASH)
  )
  private val singletonKey = ReferenceModeStorageKey(
    backingKey = backingKey,
    storageKey = DatabaseStorageKey.Persistent("singleton", DummyEntity.SCHEMA_HASH)
  )
  private lateinit var databaseManager: AndroidSqliteDatabaseManager
  private lateinit var fakeTime: FakeTime
  private lateinit var scheduler: Scheduler
  private lateinit var app: Application

  // Creating a new endpoint manager each time, and thus, new StorageProxies.
  private fun storageEndpointManager() = AndroidStorageServiceEndpointManager(
    CoroutineScope(Dispatchers.Default),
    // Creating a new BindHelper each time, and thus a new service & new stores.
    // TODO(b/171482684) Use the same binding throughout each test.
    TestBindHelper(app)
  )

  private val handleManagerImpl: HandleManagerImpl
    // Create a new handle manager on each call, to check different storage proxies.
    get() = HandleManagerImpl(
      time = fakeTime,
      scheduler = scheduler,
      storageEndpointManager = storageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )

  @Before
  fun setUp() {
    app = ApplicationProvider.getApplicationContext()
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
    fakeTime = FakeTime()
    scheduler = schedulerProvider("myArc")
    SchemaRegistry.register(DummyEntity.SCHEMA)
    SchemaRegistry.register(InlineDummyEntity.SCHEMA)
  }

  @After
  fun tearDown() {
    scheduler.cancel()
  }

  @Test
  fun singletonWithExpiredEntities() = runBlocking {
    setUpManager()
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
    val readyJob = Job()
    var storeEntity1: Job? = null
    handle.onReady {
      log("handle ready")

      // Set a time in the past. So that this entity is already expired.
      fakeTime.millis = 1L
      storeEntity1 = handle.store(entity1)
      log("completing ready job")
      readyJob.complete()
    }
    readyJob.join()
    log("awaiting completiion of store job")
    storeEntity1!!.join()
    log("moving time forward")
    fakeTime.millis = System.currentTimeMillis()
    assertThat(handle.dispatchFetch()).isEqualTo(null)

    val updateJob = Job()
    handle.onUpdate {
      log("received update from databaseManager.removeExpiredEntities()")
      updateJob.complete()
      log("completed")
    }

    // Simulate periodic job triggering.
    log("Removing Expired Entities")
    databaseManager.removeExpiredEntities()
    updateJob.join()
    assertThat(handle.dispatchFetch()).isEqualTo(null)

    // Create a new handle manager with a new storage proxy to confirm entity1 is gone and the
    // singleton is still in a good state.
    log("creating handle2")
    val handle2 = createSingletonHandle()
    val readyDeferred = CompletableDeferred<Unit>()
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
        readyDeferred.complete(Unit)
      } catch (e: Throwable) {
        readyDeferred.completeExceptionally(e)
      }
    }
    readyDeferred.await()
    modifications.joinAll()
    log("all done")
  }

  @Test
  fun collectionWithExpiredEntities() = runBlocking {
    setUpManager()
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

    var deferred = CompletableDeferred<Unit>()
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
        log("handle should contain only entity 2")
        assertThat(handle.fetchAll()).containsExactly(entity2)
        deferred.complete(Unit)
      } catch (e: Throwable) {
        deferred.completeExceptionally(e)
      }
    }
    log(
      "OnReady listener set up, waiting for it to get called, as well as for the " +
        "completion of the writes it triggers."
    )
    deferred.await()
    log("OnReady finished.")
    activeWrites.joinAll()
    log("Writes finished.")
    activeWrites.clear()

    log("Initial writes completed, now we're going to to remove expired entities.")

    deferred = CompletableDeferred()
    handle.onUpdate {
      try {
        assertThat(handle.fetchAll()).containsExactly(entity2)

        activeWrites.add(handle.store(entity3))
        assertThat(handle.fetchAll()).containsExactly(entity2, entity3)

        deferred.complete(Unit)
      } catch (e: Throwable) {
        deferred.completeExceptionally(e)
      }
    }

    // Simulate periodic job triggering.
    log("removing expired entities")
    databaseManager.removeExpiredEntities()
    deferred.await()
    activeWrites.joinAll()
    activeWrites.clear()

    // Create a new handle manager with a new storage proxy to confirm entity1 is gone and the
    // collection is still in a good state.
    val handle2 = createCollectionHandle()
    deferred = CompletableDeferred()
    handle2.onReady {
      try {
        assertThat(handle2.fetchAll()).containsExactly(entity2, entity3)

        activeWrites.add(handle2.store(entity4))
        assertThat(handle2.fetchAll()).containsExactly(entity2, entity3, entity4)
        deferred.complete(Unit)
      } catch (e: Throwable) {
        deferred.completeExceptionally(e)
      }
    }
    deferred.join()
    activeWrites.joinAll()
  }

  @Test
  fun sameEntityInTwoCollections() = runBlocking {
    setUpManager()
    val entity1 = DummyEntity().apply { num = 1.0 }
    val entity2 = DummyEntity().apply { num = 2.0 }
    val entity3 = DummyEntity().apply { num = 3.0 }
    val entity4 = DummyEntity().apply { num = 4.0 }

    val handle1 = createCollectionHandle(Ttl.Minutes(1))

    // A separate collection with the same backing store.
    val collectionKey2 = ReferenceModeStorageKey(
      backingKey = backingKey,
      storageKey = DatabaseStorageKey.Persistent("collection2", DummyEntity.SCHEMA_HASH)
    )
    val handle2 = createCollectionHandle(Ttl.Minutes(2), collectionKey2)

    // Insert at time now-90seconds. So all entities in handle1 will be expired, those in
    // handle2 are still alive.
    fakeTime.millis = System.currentTimeMillis() - 90_000

    handle1.dispatchStore(entity1, entity2)
    handle2.dispatchStore(entity1, entity3, entity4)
    handle1.dispatchStore(entity4)

    scheduler.waitForIdle()

    val deferred1 = CompletableDeferred<Unit>()
    handle1.onUpdate {
      try {
        // Entity4 is present because it was first stored through handle2.
        assertThat(handle1.fetchAll()).containsExactly(entity4)
        deferred1.complete(Unit)
      } catch (e: Throwable) {
        deferred1.completeExceptionally(e)
      }
    }

    val deferred2 = CompletableDeferred<Unit>()
    handle2.onUpdate {
      try {
        // Entity1 is gone because it was first stored through handle1.
        assertThat(handle2.fetchAll()).containsExactly(entity3, entity4)
        deferred2.complete(Unit)
      } catch (e: Throwable) {
        deferred2.completeExceptionally(e)
      }
    }

    // Simulate periodic job triggering.
    databaseManager.removeExpiredEntities()

    deferred1.await()
    deferred2.await()
  }

  @Test
  fun handleWithTtlNoExpiredEntities() = runBlocking {
    setUpManager()
    val entity1 = DummyEntity().apply { num = 1.0 }
    val entity2 = DummyEntity().apply { num = 2.0 }

    // Note: this tests a handle configured with TTL (thus entities have an expiry time).
    val handle1 = createCollectionHandle()
    val handle2 = createSingletonHandle()

    // Store at time now, so entities are not expired.
    fakeTime.millis = System.currentTimeMillis()

    handle1.dispatchStore(entity1)
    handle2.dispatchStore(entity2)

    // Simulate periodic job triggering.
    databaseManager.removeExpiredEntities()

    assertThat(handle1.dispatchFetchAll()).containsExactly(entity1)
    assertThat(handle2.dispatchFetch()).isEqualTo(entity2)
  }

  @Test
  fun databaseResetWhenTooLarge() = runBlocking {
    // Database can only store 20 bytes, hence it will be wiped when we call removeExpiredEntities.
    setUpManager(20)
    val handle = createCollectionHandle()
    val entity = DummyEntity().apply { num = 1.0 }

    // Sync the handle, then store entity
    val readyJob = Job()
    var storeEntity: Job? = null
    handle.onReady {
      log("handle ready")
      // Store at time now, so entities are not expired.
      fakeTime.millis = System.currentTimeMillis()
      storeEntity = handle.store(entity)
      log("completing ready job")
      readyJob.complete()
    }
    readyJob.join()
    log("awaiting completion of store job")
    storeEntity!!.join()

    val updateJob = Job()
    handle.onUpdate {
      log("received update from databaseManager.removeExpiredEntities()")
      updateJob.complete()
      log("completed")
    }

    // Simulate periodic job triggering.
    log("Removing Expired Entities")
    databaseManager.removeExpiredEntities()
    updateJob.join()

    assertThat(handle.dispatchFetchAll()).isEmpty()
  }

  @Test
  fun expiredWithInlineEntities() = runBlocking<Unit> {
    setUpManager()
    val handle = createCollectionHandle()
    val entity1 = DummyEntity().apply { inlineEntity = InlineDummyEntity().apply { text = "1" } }
    val entity2 = DummyEntity().apply {
      inlineList = listOf(InlineDummyEntity().apply { text = "2" })
    }
    val entity3 = DummyEntity().apply { inlineEntity = InlineDummyEntity().apply { text = "3" } }
    val entity4 = DummyEntity().apply {
      inlineList = listOf(InlineDummyEntity().apply { text = "4" })
    }

    // Set a time in the past. So that these entities are already expired.
    fakeTime.millis = 1L
    handle.dispatchStore(entity1)
    handle.dispatchStore(entity2)

    // Then set time to now and add the other two entities - not expired.
    fakeTime.millis = System.currentTimeMillis()
    handle.dispatchStore(entity3)
    handle.dispatchStore(entity4)

    assertThat(handle.dispatchFetchAll()).containsExactly(entity3, entity4)

    // Simulate periodic job triggering.
    databaseManager.removeExpiredEntities()

    // Create a new handle manager to ensure we read from the database.
    val handle2 = createCollectionHandle()
    assertThat(handle2.dispatchFetchAll()).containsExactly(entity3, entity4)
  }

  private fun setUpManager(maxDbSize: Int = AndroidSqliteDatabaseManager.MAX_DB_SIZE_BYTES) {
    databaseManager = AndroidSqliteDatabaseManager(
      ApplicationProvider.getApplicationContext(),
      maxDbSize
    )
    DriverAndKeyConfigurator.configure(databaseManager)
  }

  @Suppress("UNCHECKED_CAST")
  private suspend fun createCollectionHandle(
    ttl: Ttl = Ttl.Hours(1),
    key: StorageKey = collectionKey
  ) = handleManagerImpl.createHandle(
    HandleSpec(
      "name",
      HandleMode.ReadWrite,
      CollectionType(EntityType(DummyEntity.SCHEMA)),
      DummyEntity
    ),
    key,
    ttl
  ).awaitReady() as ReadWriteCollectionHandle<DummyEntity>

  @Suppress("UNCHECKED_CAST")
  private suspend fun createSingletonHandle() =
    handleManagerImpl.createHandle(
      HandleSpec(
        "name",
        HandleMode.ReadWrite,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        DummyEntity
      ),
      singletonKey,
      Ttl.Hours(1)
    ).awaitReady() as ReadWriteSingletonHandle<DummyEntity>
}
