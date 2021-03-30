package arcs.core.entity

import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.entity.testutil.FixtureEntities
import arcs.core.entity.testutil.FixtureEntity
import arcs.core.entity.testutil.FixtureEntitySlice
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("UNCHECKED_CAST")
@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class HandleManagerCloseTest {

  @get:Rule
  val log = LogRule()

  private val backingKey = RamDiskStorageKey("entities")
  private val singletonRefKey = RamDiskStorageKey("single-ent")
  private val singletonKey = ReferenceModeStorageKey(
    backingKey = backingKey,
    storageKey = singletonRefKey
  )

  private val collectionRefKey = RamDiskStorageKey("collection-ent")
  private val collectionKey = ReferenceModeStorageKey(
    backingKey = backingKey,
    storageKey = collectionRefKey
  )
  private val fixtureEntities = FixtureEntities()
  private lateinit var schedulerProvider: SimpleSchedulerProvider

  @Before
  fun setUp() {
    schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
    DriverAndKeyConfigurator.configure(null)
  }

  @After
  fun tearDown() {
    schedulerProvider.cancelAll()
  }

  private fun createHandleManager() = HandleManagerImpl(
    arcId = "testArc",
    hostId = "",
    time = FakeTime(),
    scheduler = schedulerProvider("test"),
    storageEndpointManager = testStorageEndpointManager(),
    foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
  )

  @Test
  fun closeHandleManagerStopUpdates() = runBlocking {
    val handleManagerA = createHandleManager()
    val handleManagerB = createHandleManager()

    val handleA = handleManagerA.createSingletonHandle()

    val handleB = handleManagerB.createSingletonHandle()
    var updates = 0
    var updateCalled = Job()
    handleB.onUpdate {
      updates++
      updateCalled.complete()
    }

    handleA.dispatchStore(fixtureEntities.generate())
    updateCalled.join()
    assertThat(updates).isEqualTo(1)

    handleManagerB.close()

    updateCalled = Job()
    handleA.dispatchStore(fixtureEntities.generate())
    assertFailsWith<TimeoutCancellationException> {
      withTimeout(100) { updateCalled.join() }
    }
    assertThat(updates).isEqualTo(1)

    // Clean-up
    handleManagerA.close()
  }

  @Test
  fun singleton_closeHandleManagerThrowsExceptionOnOperations() = runBlocking {
    val handleManager = createHandleManager()

    val handle = handleManager.createSingletonHandle()

    handleManager.close()

    val entity = fixtureEntities.generate(entityId = "1")

    listOf(
      "store" to suspend { handle.store(entity) },
      "onUpdate" to suspend { handle.onUpdate {} },
      "onReady" to suspend { handle.onReady {} },
      "onResync" to suspend { handle.onResync {} },
      "onDesync" to suspend { handle.onDesync {} },
      "clear" to suspend { handle.clear() },
      "createReference" to suspend { handle.createReference(entity); Unit },
      "fetch" to suspend { handle.fetch(); Unit }
    ).forEach { (name, fn) ->
      log("calling $name")
      assertFailsWith<IllegalStateException> { fn() }
    }
  }

  @Test
  fun collection_closeHandleManagerThrowsExceptionOnOperations() = runBlocking {
    val handleManager = createHandleManager()

    val handle = handleManager.createCollectionHandle()

    handleManager.close()

    val entity = fixtureEntities.generate(entityId = "1")

    listOf(
      "store" to suspend { handle.store(entity) },
      "remove" to suspend { handle.remove(entity) },
      "onUpdate" to suspend { handle.onUpdate {} },
      "onReady" to suspend { handle.onReady {} },
      "onResync" to suspend { handle.onResync {} },
      "onDesync" to suspend { handle.onDesync {} },
      "clear" to suspend { handle.clear() },
      "createReference" to suspend { handle.createReference(entity); Unit },
      "fetchAll" to suspend { handle.fetchAll(); Unit },
      "size" to suspend { handle.size(); Unit },
      "isEmpty" to suspend { handle.isEmpty(); Unit }
    ).forEach { (name, fn) ->
      log("calling $name")
      assertFailsWith<IllegalStateException> { fn() }
    }
  }

  @Suppress("UNCHECKED_CAST")
  private suspend fun HandleManagerImpl.createSingletonHandle(
    storageKey: StorageKey = singletonKey,
    name: String = "singletonHandle",
    ttl: Ttl = Ttl.Infinite()
  ) = (
    createHandle(
      HandleSpec(
        name,
        HandleMode.ReadWrite,
        SingletonType(EntityType(FixtureEntity.SCHEMA)),
        FixtureEntity
      ),
      storageKey,
      ttl
    ) as ReadWriteSingletonHandle<FixtureEntity, FixtureEntitySlice>
    ).awaitReady()

  @Suppress("UNCHECKED_CAST")
  private suspend fun HandleManagerImpl.createCollectionHandle(
    storageKey: StorageKey = collectionKey,
    name: String = "collectionKey",
    ttl: Ttl = Ttl.Infinite()
  ) = (
    createHandle(
      HandleSpec(
        name,
        HandleMode.ReadWrite,
        CollectionType(EntityType(FixtureEntity.SCHEMA)),
        FixtureEntity
      ),
      storageKey,
      ttl
    ) as ReadWriteCollectionHandle<FixtureEntity, FixtureEntitySlice>
    ).awaitReady()
}
