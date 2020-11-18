package arcs.core.entity

import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.entity.AbstractTestParticle.CoolnessIndex
import arcs.core.entity.AbstractTestParticle.Person
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.withTimeout
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

  // TODO(b/173722160) Convert these tests to use scope.runBlockingTest
  val scope = TestCoroutineScope()

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

  @Before
  fun setUp() {
    DriverAndKeyConfigurator.configure(null)
  }

  fun createHandleManager(name: String = "handleManager") = EntityHandleManager(
    arcId = "testArc",
    hostId = "",
    time = FakeTime(),
    scheduler = Scheduler(scope, name),
    storageEndpointManager = testStorageEndpointManager(),
    foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
  )

  @Test
  fun closeHandleManagerStopUpdates() = runBlocking {
    val handleManagerA = createHandleManager()
    val handleManagerB = createHandleManager("handleManagerB")

    val handleA = handleManagerA.createSingletonHandle()

    val handleB = handleManagerB.createSingletonHandle()
    var updates = 0
    var updateCalled = Job()
    handleB.onUpdate {
      updates++
      updateCalled.complete()
    }

    handleA.dispatchStore(Person("p1", 1.0, coolnessIndex = CoolnessIndex(1, true)))
    updateCalled.join()
    assertThat(updates).isEqualTo(1)

    handleManagerB.close()

    updateCalled = Job()
    handleA.dispatchStore(Person("p2", 2.0, coolnessIndex = CoolnessIndex(1, true)))
    assertSuspendingThrows(TimeoutCancellationException::class) {
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

    val person = Person("p", 1.0, entityId = "1", coolnessIndex = CoolnessIndex(1, true))

    listOf(
      "store" to suspend { handle.store(person) },
      "onUpdate" to suspend { handle.onUpdate {} },
      "onReady" to suspend { handle.onReady {} },
      "onResync" to suspend { handle.onResync {} },
      "onDesync" to suspend { handle.onDesync {} },
      "clear" to suspend { handle.clear() },
      "createReference" to suspend { handle.createReference(person); Unit },
      "fetch" to suspend { handle.fetch(); Unit }
    ).forEach { (name, fn) ->
      log("calling $name")
      assertSuspendingThrows(IllegalStateException::class) { fn() }
    }
  }

  @Test
  fun collection_closeHandleManagerThrowsExceptionOnOperations() = runBlocking {
    val handleManager = createHandleManager()

    val handle = handleManager.createCollectionHandle()

    handleManager.close()

    val person = Person("p", 1.0, entityId = "1", coolnessIndex = CoolnessIndex(1, true))

    listOf(
      "store" to suspend { handle.store(person) },
      "remove" to suspend { handle.remove(person) },
      "onUpdate" to suspend { handle.onUpdate {} },
      "onReady" to suspend { handle.onReady {} },
      "onResync" to suspend { handle.onResync {} },
      "onDesync" to suspend { handle.onDesync {} },
      "clear" to suspend { handle.clear() },
      "createReference" to suspend { handle.createReference(person); Unit },
      "fetchAll" to suspend { handle.fetchAll(); Unit },
      "size" to suspend { handle.size(); Unit },
      "isEmpty" to suspend { handle.isEmpty(); Unit }
    ).forEach { (name, fn) ->
      log("calling $name")
      assertSuspendingThrows(IllegalStateException::class) { fn() }
    }
  }

  @Suppress("UNCHECKED_CAST")
  private suspend fun EntityHandleManager.createSingletonHandle(
    storageKey: StorageKey = singletonKey,
    name: String = "singletonHandle",
    ttl: Ttl = Ttl.Infinite()
  ) = (
    createHandle(
      HandleSpec(
        name,
        HandleMode.ReadWrite,
        SingletonType(EntityType(Person.SCHEMA)),
        Person
      ),
      storageKey,
      ttl
    ) as ReadWriteSingletonHandle<Person>
    ).awaitReady()

  @Suppress("UNCHECKED_CAST")
  private suspend fun EntityHandleManager.createCollectionHandle(
    storageKey: StorageKey = collectionKey,
    name: String = "collectionKey",
    ttl: Ttl = Ttl.Infinite()
  ) = (
    createHandle(
      HandleSpec(
        name,
        HandleMode.ReadWrite,
        CollectionType(EntityType(Person.SCHEMA)),
        Person
      ),
      storageKey,
      ttl
    ) as ReadWriteCollectionHandle<Person>
    ).awaitReady()
}
