package arcs.core.entity

import arcs.core.common.ReferenceId
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.entity.AbstractTestParticle.CoolnessIndex
import arcs.core.entity.AbstractTestParticle.Friend
import arcs.core.entity.AbstractTestParticle.Hat
import arcs.core.entity.AbstractTestParticle.Person
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SchedulerProvider
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.testutil.waitUntilSet
import arcs.core.storage.keys.ForeignStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.handles.dispatchClear
import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchFetchById
import arcs.core.testutil.handles.dispatchIsEmpty
import arcs.core.testutil.handles.dispatchQuery
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchRemoveByQuery
import arcs.core.testutil.handles.dispatchSize
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.ArcsStrictMode
import arcs.core.util.testutil.LogRule
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.Executors
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
open class HandleManagerTestBase {
  @get:Rule
  val log = LogRule()

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.create()

  private val backingKey = RamDiskStorageKey("entities")
  private val hatsBackingKey = RamDiskStorageKey("hats")
  protected lateinit var fakeTime: FakeTime

  private val entity1 = Person(
    entityId = "entity1",
    name = "Jason",
    age = 21.0,
    favoriteWords = listOf("coolio", "sasquatch", "indubitably"),
    coolnessIndex = CoolnessIndex(pairsOfShoesOwned = 4, isCool = false, hat = null)
  )
  private val entity2 = Person(
    entityId = "entity2",
    name = "Jason",
    age = 22.0,
    favoriteWords = listOf("wonderful", "exemplary", "yeet"),
    coolnessIndex = CoolnessIndex(pairsOfShoesOwned = 54, isCool = true, hat = null)
  )

  private val singletonRefKey = RamDiskStorageKey("single-reference")
  private val singletonKey = ReferenceModeStorageKey(
    backingKey = backingKey,
    storageKey = RamDiskStorageKey("single-ent")
  )

  private val collectionRefKey = RamDiskStorageKey("set-references")
  private val collectionKey = ReferenceModeStorageKey(
    backingKey = backingKey,
    storageKey = RamDiskStorageKey("set-ent")
  )

  private val hatCollectionRefKey = RamDiskStorageKey("set-hats")
  private val hatCollectionKey = ReferenceModeStorageKey(
    backingKey = hatsBackingKey,
    storageKey = hatCollectionRefKey
  )

  private val schedulerCoroutineContext =
    Executors.newSingleThreadExecutor().asCoroutineDispatcher()
  val schedulerProvider: SchedulerProvider = SimpleSchedulerProvider(schedulerCoroutineContext)

  private val validPackageName = "m.com.a"
  private val packageChecker: suspend (String) -> Boolean =
    { name: String -> name == validPackageName }
  val foreignReferenceChecker: ForeignReferenceChecker =
    ForeignReferenceCheckerImpl(mapOf(AbstractTestParticle.Package.SCHEMA to packageChecker))
  lateinit var readHandleManagerImpl: HandleManagerImpl
  lateinit var writeHandleManagerImpl: HandleManagerImpl
  private lateinit var monitorHandleManagerImpl: HandleManagerImpl
  var testTimeout: Long = 10000

  lateinit var monitorStorageEndpointManager: StorageEndpointManager

  open var testRunner = { block: suspend CoroutineScope.() -> Unit ->
    monitorHandleManagerImpl = HandleManagerImpl(
      arcId = "testArc",
      hostId = "monitorHost",
      time = fakeTime,
      scheduler = schedulerProvider("monitor"),
      storageEndpointManager = monitorStorageEndpointManager,
      foreignReferenceChecker = foreignReferenceChecker
    )
    runBlocking {
      withTimeout(testTimeout) { block() }
      monitorHandleManagerImpl.close()
      readHandleManagerImpl.close()
      writeHandleManagerImpl.close()
    }
  }

  // Must call from subclasses.
  open fun setUp() = runBlocking {
    // We need to initialize to -1 instead of the default (999999) because our test cases around
    // deleted items where we look for "nulled-out" entities can result in the
    // `UNINITIALIZED_TIMESTAMP` being used for creationTimestamp, and others can result in the
    // current time being used.
    // TODO: Determine why this is happening. It seems for a nulled-out entity, we shouldn't
    //  use the current time as the creationTimestamp.
    fakeTime = FakeTime(-1)
    DriverAndKeyConfigurator.configure(null)
    RamDisk.clear()
    // Enable removeByQuery by default.
    BuildFlags.REMOVE_BY_QUERY_HANDLE = true
  }

  // Must call from subclasses
  open fun tearDown() = runBlocking {
    // TODO(b/151366899): this is less than ideal - we should investigate how to make the entire
    //  test process cancellable/stoppable, even when we cross scopes into a BindingContext or
    //  over to other RamDisk listeners.
    readHandleManagerImpl.close()
    writeHandleManagerImpl.close()
    schedulerProvider.cancelAll()
  }

  @Test
  fun singleton_initialStateAndSingleHandleOperations() = testRunner {
    val handle = writeHandleManagerImpl.createSingletonHandle()

    // Don't use the dispatchX helpers so we can test the immediate effect of the handle ops.
    withContext(handle.dispatcher) {
      // Initial state.
      assertThat(handle.fetch()).isNull()

      // Verify that clear works on an empty singleton.
      val jobs = mutableListOf<Job>()
      jobs.add(handle.clear())
      assertThat(handle.fetch()).isNull()

      // All handle ops should be locally immediate (no joins needed).
      jobs.add(handle.store(entity1))
      assertThat(handle.fetch()).isEqualTo(entity1)
      jobs.add(handle.clear())
      assertThat(handle.fetch()).isNull()

      // The joins should still work.
      jobs.joinAll()
    }
  }

  @Test
  fun singleton_writeAndReadBack_unidirectional() = testRunner {
    // Write-only handle -> read-only handle
    val writeHandle = writeHandleManagerImpl.createHandle(
      HandleSpec(
        "writeOnlySingleton",
        HandleMode.Write,
        SingletonType(EntityType(Person.SCHEMA)),
        Person
      ),
      singletonKey
    ).awaitReady() as WriteSingletonHandle<Person>
    val readHandle = readHandleManagerImpl.createHandle(
      HandleSpec(
        "readOnlySingleton",
        HandleMode.Read,
        SingletonType(EntityType(Person.SCHEMA)),
        Person
      ),
      singletonKey
    ).awaitReady() as ReadSingletonHandle<Person>
    var received = Job()
    readHandle.onUpdate { received.complete() }

    // Verify store against empty.
    writeHandle.dispatchStore(entity1)
    received.join()
    assertThat(readHandle.dispatchFetch()).isEqualTo(entity1)

    // Verify store overwrites existing.
    received = Job()
    writeHandle.dispatchStore(entity2)
    received.join()
    assertThat(readHandle.dispatchFetch()).isEqualTo(entity2)

    // Verify clear.
    received = Job()
    writeHandle.dispatchClear()
    received.join()
    assertThat(readHandle.dispatchFetch()).isNull()
  }

  @Test
  fun singleton_writeAndReadBack_bidirectional() = testRunner {
    // Read/write handle <-> read/write handle
    val handle1 = writeHandleManagerImpl.createHandle(
      HandleSpec(
        "readWriteSingleton1",
        HandleMode.ReadWrite,
        SingletonType(EntityType(Person.SCHEMA)),
        Person
      ),
      singletonKey
    ).awaitReady() as ReadWriteSingletonHandle<Person>

    val handle2 = readHandleManagerImpl.createHandle(
      HandleSpec(
        "readWriteSingleton2",
        HandleMode.ReadWrite,
        SingletonType(EntityType(Person.SCHEMA)),
        Person
      ),
      singletonKey
    ).awaitReady() as ReadWriteSingletonHandle<Person>

    // handle1 -> handle2
    val received1to2 = Job()
    handle2.onUpdate { received1to2.complete() }

    // Verify that handle2 sees the entity stored by handle1.
    handle1.dispatchStore(entity1)
    received1to2.join()
    assertThat(handle2.dispatchFetch()).isEqualTo(entity1)

    // handle2 -> handle1
    var received2to1 = Job()
    handle1.onUpdate { received2to1.complete() }

    // Verify that handle2 can clear the entity stored by handle1.
    handle2.dispatchClear()
    received2to1.join()
    assertThat(handle1.dispatchFetch()).isNull()

    // Verify that handle1 sees the entity stored by handle2.
    received2to1 = Job()
    handle2.dispatchStore(entity2)
    received2to1.join()
    assertThat(handle1.dispatchFetch()).isEqualTo(entity2)
  }

  @Test
  fun singleton_dereferenceEntity() = testRunner {
    // Arrange: reference handle.
    val friendsStorageKey = ReferenceModeStorageKey(backingKey, RamDiskStorageKey("friends"))
    val friendsHandle =
      writeHandleManagerImpl.createSingletonHandle(
        storageKey = friendsStorageKey,
        entitySpec = Friend
      )
    val friend1 = Friend("1")
    friendsHandle.dispatchStore(friend1)

    // Arrange: entity handle.
    val writeHandle = writeHandleManagerImpl.createSingletonHandle()
    val readHandle = readHandleManagerImpl.createSingletonHandle()
    val readHandleUpdated = readHandle.onUpdateDeferred()

    // Act.
    writeHandle.dispatchStore(
      entity1.mutate(bestFriend = friendsHandle.dispatchCreateReference(friend1))
    )
    readHandleUpdated.join()
    log("Wrote entity1 to writeHandle")

    // Assert: read back entity1, and dereference its best_friend.
    log("Checking entity1's best friend")
    val dereferencedFriend = readHandle.dispatchFetch()!!.bestFriend!!.dereference()!!
    assertThat(dereferencedFriend).isEqualTo(friend1)
  }

  @Test
  fun singleton_dereferenceEntity_nestedReference() = testRunner {
    // Create a stylish new hat, and create a reference to it.
    val hatCollection = writeHandleManagerImpl.createHandle(
      HandleSpec(
        "hatCollection",
        HandleMode.ReadWrite,
        CollectionType(EntityType(Hat.SCHEMA)),
        Hat
      ),
      hatCollectionKey
    ) as ReadWriteCollectionHandle<Hat>

    val fez = Hat(style = "fez")
    hatCollection.dispatchStore(fez)
    val fezRef = hatCollection.dispatchCreateReference(fez)

    // Give the hat to an entity and store it.
    val personWithHat = Person(
      entityId = "a-hatted-individual",
      name = "Jason",
      age = 25.0,
      bestFriend = null,
      favoriteWords = listOf("Fez"),
      coolnessIndex = CoolnessIndex(
        pairsOfShoesOwned = 555,
        isCool = true,
        hat = fezRef
      )
    )
    val writeHandle = writeHandleManagerImpl.createSingletonHandle()
    val readHandle = readHandleManagerImpl.createSingletonHandle()
    val readOnUpdate = readHandle.onUpdateDeferred()

    writeHandle.dispatchStore(personWithHat)

    RamDisk.waitUntilSet(fezRef.toReferencable().referencedStorageKey())
    readOnUpdate.join()

    // Read out the entity, and fetch its hat.
    val entityOut = readHandle.dispatchFetch()!!
    val hatRef = entityOut.coolnessIndex.hat!!
    assertThat(hatRef).isEqualTo(fezRef)
    val hat = hatRef.dereference()!!
    assertThat(hat).isEqualTo(fez)
  }

  @Test
  fun singleton_referenceForeign() = testRunner {
    val writeHandle =
      writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)

    val reference =
      writeHandle.createForeignReference(AbstractTestParticle.Package, validPackageName)
    assertThat(reference).isNotNull()
    assertThat(reference!!.toReferencable().storageKey).isEqualTo(ForeignStorageKey("Package"))
    assertThat(reference.dereference()).isNotNull()

    val entity = TestParticle_Entities(text = "Hello", app = reference)
    writeHandle.dispatchStore(entity)

    val readHandle =
      readHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)
    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity)
    val readBack = readHandle.dispatchFetchAll().single().app!!
    assertThat(readBack.entityId).isEqualTo(validPackageName)
    assertThat(readBack.dereference()).isNotNull()

    // Make an invalid reference.
    assertThat(
      writeHandle.createForeignReference(AbstractTestParticle.Package, "invalid")
    ).isNull()
  }

  @Test
  fun singleton_noTTL() = testRunner {
    val handle = writeHandleManagerImpl.createSingletonHandle()
    val handleB = readHandleManagerImpl.createSingletonHandle()
    val handleBUpdated = handleB.onUpdateDeferred()

    val expectedCreateTime = 123456789L
    fakeTime.millis = expectedCreateTime

    handle.dispatchStore(entity1)
    handleBUpdated.join()

    val readBack = handleB.dispatchFetch()!!
    assertThat(readBack.creationTimestamp).isEqualTo(expectedCreateTime)
    assertThat(readBack.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
  }

  @Test
  fun singleton_withTTL() = testRunner {
    fakeTime.millis = 0
    val handle = writeHandleManagerImpl.createSingletonHandle(ttl = Ttl.Days(2))
    val handleB = readHandleManagerImpl.createSingletonHandle()

    var handleBUpdated = handleB.onUpdateDeferred()
    handle.dispatchStore(entity1)
    handleBUpdated.join()

    val readBack = handleB.dispatchFetch()!!
    assertThat(readBack.creationTimestamp).isEqualTo(0)
    assertThat(readBack.expirationTimestamp).isEqualTo(2 * 24 * 3600 * 1000)

    val handleC = readHandleManagerImpl.createSingletonHandle(ttl = Ttl.Minutes(2))
    handleBUpdated = handleB.onUpdateDeferred()
    handleC.dispatchStore(entity2)
    handleBUpdated.join()

    val readBack2 = handleB.dispatchFetch()!!
    assertThat(readBack2.creationTimestamp).isEqualTo(0)
    assertThat(readBack2.expirationTimestamp).isEqualTo(2 * 60 * 1000)

    // Fast forward time to 5 minutes later, so entity2 expires.
    fakeTime.millis += 5 * 60 * 1000
    assertThat(handleB.dispatchFetch()).isNull()
  }

  @Test
  fun referenceSingleton_withTtl() = testRunner {
    fakeTime.millis = 0
    // Create and store an entity with no TTL.
    val entityHandle = writeHandleManagerImpl.createSingletonHandle()
    val refHandle = writeHandleManagerImpl.createReferenceSingletonHandle(ttl = Ttl.Minutes(2))
    val updated = entityHandle.onUpdateDeferred()
    entityHandle.dispatchStore(entity1)
    updated.join()

    // Create and store a reference with TTL.
    val entity1Ref = entityHandle.dispatchCreateReference(entity1)
    refHandle.dispatchStore(entity1Ref)
    val readBack = refHandle.dispatchFetch()!!
    assertThat(readBack.creationTimestamp).isEqualTo(0)
    assertThat(readBack.expirationTimestamp).isEqualTo(2 * 60 * 1000)

    // Fast forward time to 5 minutes later, so the reference expires.
    fakeTime.millis += 5 * 60 * 1000
    assertThat(refHandle.dispatchFetch()).isNull()
  }

  @Test
  fun singleton_referenceLiveness() = testRunner {
    // Create and store an entity.
    val writeEntityHandle = writeHandleManagerImpl.createCollectionHandle()
    val monitorHandle = monitorHandleManagerImpl.createCollectionHandle()
    val initialEntityStored = monitorHandle.onUpdateDeferred { it.size() == 1 }
    writeEntityHandle.dispatchStore(entity1)
    initialEntityStored.join()
    log("Created and stored an entity")

    // Create and store a reference to the entity.
    val entity1Ref = writeEntityHandle.dispatchCreateReference(entity1)
    val writeRefHandle = writeHandleManagerImpl.createReferenceSingletonHandle()
    val readRefHandle = readHandleManagerImpl.createReferenceSingletonHandle()
    val refHeard = readRefHandle.onUpdateDeferred()
    writeRefHandle.dispatchStore(entity1Ref)
    log("Created and stored a reference")

    RamDisk.waitUntilSet(entity1Ref.toReferencable().referencedStorageKey())
    refHeard.join()

    // Now read back the reference from a different handle.
    var reference = readRefHandle.dispatchFetch()!!
    assertThat(reference).isEqualTo(entity1Ref)

    // Reference should be alive.
    assertThat(reference.dereference()).isEqualTo(entity1)
    var storageReference = reference.toReferencable()
    assertThat(storageReference.isAlive()).isTrue()
    assertThat(storageReference.isDead()).isFalse()

    // Modify the entity.
    val modEntity1 = entity1.mutate(name = "Ben")
    val entityModified = monitorHandle.onUpdateDeferred {
      it.fetchAll().all { person -> person.name == "Ben" }
    }
    writeEntityHandle.dispatchStore(modEntity1)
    assertThat(writeEntityHandle.dispatchSize()).isEqualTo(1)
    entityModified.join()

    // Reference should still be alive.
    reference = readRefHandle.dispatchFetch()!!
    val dereferenced = reference.dereference()
    log("Dereferenced: $dereferenced")
    assertThat(dereferenced).isEqualTo(modEntity1)
    storageReference = reference.toReferencable()
    assertThat(storageReference.isAlive()).isTrue()
    assertThat(storageReference.isDead()).isFalse()

    // Remove the entity from the collection.
    val heardTheDelete = monitorHandle.onUpdateDeferred { it.isEmpty() }
    writeEntityHandle.dispatchRemove(entity1)
    heardTheDelete.join()

    // Reference should be dead. (Removed entities currently aren't actually deleted, but
    // instead are "nulled out".)
    assertThat(storageReference.dereference()).isEqualTo(createNulledOutPerson("entity1"))
  }

  @Test
  fun singleton_referenceHandle_referenceModeNotSupported() = testRunner {
    val e = assertSuspendingThrows(IllegalArgumentException::class) {
      writeHandleManagerImpl.createReferenceSingletonHandle(
        ReferenceModeStorageKey(
          backingKey = backingKey,
          storageKey = singletonRefKey
        )
      )
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Reference-mode storage keys are not supported for reference-typed handles."
    )
  }

  @Test
  fun collection_initialStateAndSingleHandleOperations() = testRunner {
    val handle = writeHandleManagerImpl.createCollectionHandle()

    // Don't use the dispatchX helpers so we can test the immediate effect of the handle ops.
    withContext(handle.dispatcher) {
      // Initial state.
      assertThat(handle.size()).isEqualTo(0)
      assertThat(handle.isEmpty()).isEqualTo(true)
      assertThat(handle.fetchAll()).isEmpty()

      // Verify that both clear and removing a random entity with an empty collection are ok.
      val jobs = mutableListOf<Job>()
      jobs.add(handle.clear())
      jobs.add(handle.remove(entity1))

      // All handle ops should be locally immediate (no joins needed).
      jobs.add(handle.store(entity1))
      jobs.add(handle.store(entity2))
      assertThat(handle.size()).isEqualTo(2)
      assertThat(handle.isEmpty()).isEqualTo(false)
      assertThat(handle.fetchAll()).containsExactly(entity1, entity2)
      assertThat(handle.fetchById(entity1.entityId!!)).isEqualTo(entity1)
      assertThat(handle.fetchById(entity2.entityId!!)).isEqualTo(entity2)

      jobs.add(handle.remove(entity1))
      assertThat(handle.size()).isEqualTo(1)
      assertThat(handle.isEmpty()).isEqualTo(false)
      assertThat(handle.fetchAll()).containsExactly(entity2)
      assertThat(handle.fetchById(entity1.entityId!!)).isNull()
      assertThat(handle.fetchById(entity2.entityId!!)).isEqualTo(entity2)

      jobs.add(handle.clear())
      assertThat(handle.size()).isEqualTo(0)
      assertThat(handle.isEmpty()).isEqualTo(true)
      assertThat(handle.fetchAll()).isEmpty()
      assertThat(handle.fetchById(entity1.entityId!!)).isNull()
      assertThat(handle.fetchById(entity2.entityId!!)).isNull()

      // The joins should still work.
      jobs.joinAll()
    }
  }

  @Test
  fun collection_remove_needsId() = testRunner {
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)
    val entity = TestParticle_Entities(text = "Hello")
    // Entity does not have an ID, it cannot be removed.
    assertSuspendingThrows(IllegalStateException::class) {
      handle.dispatchRemove(entity)
    }

    // Entity with an ID, it can be removed
    val entity2 = TestParticle_Entities(text = "Hello", entityId = "id")
    handle.dispatchRemove(entity2)
  }

  @Test
  fun removeByQuery_oneRemoved() = testRunner {
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)
    val entity = TestParticle_Entities(text = "one")
    val entity2 = TestParticle_Entities(text = "two")
    handle.dispatchStore(entity, entity2)

    handle.dispatchRemoveByQuery("two")

    assertThat(handle.dispatchFetchAll()).containsExactly(entity)
  }

  @Test
  fun removeByQuery_zeroRemoved() = testRunner {
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)
    val entity = TestParticle_Entities(text = "one")
    val entity2 = TestParticle_Entities(text = "two")
    handle.dispatchStore(entity, entity2)

    handle.dispatchRemoveByQuery("three")

    assertThat(handle.dispatchFetchAll()).containsExactly(entity, entity2)
  }

  @Test
  fun removeByQuery_emptyCollection() = testRunner {
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)

    handle.dispatchRemoveByQuery("one")

    assertThat(handle.dispatchFetchAll()).isEmpty()
  }

  @Test
  fun removeByQuery_allRemoved() = testRunner {
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)
    val entity = TestParticle_Entities(text = "two")
    val entity2 = TestParticle_Entities(text = "two")
    handle.dispatchStore(entity, entity2)

    handle.dispatchRemoveByQuery("two")

    assertThat(handle.dispatchFetchAll()).isEmpty()
  }

  @Test
  fun removeByQueryDisabled_throwsException() = testRunner {
    BuildFlags.REMOVE_BY_QUERY_HANDLE = false
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)

    assertFailsWith<BuildFlagDisabledError> { handle.dispatchRemoveByQuery("two") }
  }

  @Test
  fun collection_writeAndReadBack_unidirectional() = testRunner {
    // Write-only handle -> read-only handle
    val writeHandle = writeHandleManagerImpl.createHandle(
      HandleSpec(
        "writeOnlyCollection",
        HandleMode.Write,
        CollectionType(EntityType(Person.SCHEMA)),
        Person
      ),
      collectionKey
    ).awaitReady() as WriteCollectionHandle<Person>

    val readHandle = readHandleManagerImpl.createHandle(
      HandleSpec(
        "readOnlyCollection",
        HandleMode.Read,
        CollectionType(EntityType(Person.SCHEMA)),
        Person
      ),
      collectionKey
    ).awaitReady() as ReadCollectionHandle<Person>

    val entity3 =
      Person("Wanda", 60.0, entityId = "entity3", coolnessIndex = CoolnessIndex(100, true))

    var received = Job()
    var size = 3
    readHandle.onUpdate { if (readHandle.size() == size) received.complete() }

    // Verify store.
    writeHandle.dispatchStore(entity1, entity2, entity3)
    received.join()
    assertThat(readHandle.dispatchSize()).isEqualTo(3)
    assertThat(readHandle.dispatchIsEmpty()).isEqualTo(false)
    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity1, entity2, entity3)
    assertThat(readHandle.dispatchFetchById(entity1.entityId!!)).isEqualTo(entity1)
    assertThat(readHandle.dispatchFetchById(entity2.entityId!!)).isEqualTo(entity2)
    assertThat(readHandle.dispatchFetchById(entity3.entityId!!)).isEqualTo(entity3)

    // Verify remove.
    received = Job()
    size = 2
    writeHandle.dispatchRemove(entity2)
    received.join()
    assertThat(readHandle.dispatchSize()).isEqualTo(2)
    assertThat(readHandle.dispatchIsEmpty()).isEqualTo(false)
    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity1, entity3)
    assertThat(readHandle.dispatchFetchById(entity1.entityId!!)).isEqualTo(entity1)
    assertThat(readHandle.dispatchFetchById(entity2.entityId!!)).isNull()
    assertThat(readHandle.dispatchFetchById(entity3.entityId!!)).isEqualTo(entity3)

    // Verify clear.
    received = Job()
    size = 0
    writeHandle.dispatchClear()
    received.join()
    assertThat(readHandle.dispatchSize()).isEqualTo(0)
    assertThat(readHandle.dispatchIsEmpty()).isEqualTo(true)
    assertThat(readHandle.dispatchFetchAll()).isEmpty()
    assertThat(readHandle.dispatchFetchById(entity1.entityId!!)).isNull()
    assertThat(readHandle.dispatchFetchById(entity2.entityId!!)).isNull()
    assertThat(readHandle.dispatchFetchById(entity3.entityId!!)).isNull()
  }

  @Test
  fun collection_writeAndReadBack_bidirectional() = testRunner {
    // Read/write handle <-> read/write handle
    val handle1 = writeHandleManagerImpl.createHandle(
      HandleSpec(
        "readWriteCollection1",
        HandleMode.ReadWrite,
        CollectionType(EntityType(Person.SCHEMA)),
        Person
      ),
      collectionKey
    ).awaitReady() as ReadWriteCollectionHandle<Person>

    val handle2 = readHandleManagerImpl.createHandle(
      HandleSpec(
        "readWriteCollection2",
        HandleMode.ReadWrite,
        CollectionType(EntityType(Person.SCHEMA)),
        Person
      ),
      collectionKey
    ).awaitReady() as ReadWriteCollectionHandle<Person>

    val entity3 = Person(
      "William",
      35.0,
      entityId = "entity3",
      coolnessIndex = CoolnessIndex(1, false)
    )

    // handle1 -> handle2
    val received1to2 = Job()
    handle2.onUpdate { if (handle2.size() == 3) received1to2.complete() }

    // Verify that handle2 sees entities stored by handle1.
    handle1.dispatchStore(entity1, entity2, entity3)
    received1to2.join()
    assertThat(handle2.dispatchSize()).isEqualTo(3)
    assertThat(handle2.dispatchIsEmpty()).isEqualTo(false)
    assertThat(handle2.dispatchFetchAll()).containsExactly(entity1, entity2, entity3)
    assertThat(handle2.dispatchFetchById(entity1.entityId!!)).isEqualTo(entity1)
    assertThat(handle2.dispatchFetchById(entity2.entityId!!)).isEqualTo(entity2)
    assertThat(handle2.dispatchFetchById(entity3.entityId!!)).isEqualTo(entity3)

    // handle2 -> handle1
    var received2to1 = Job()
    var size2to1 = 2
    handle1.onUpdate { if (handle1.size() == size2to1) received2to1.complete() }

    // Verify that handle2 can remove entities stored by handle1.
    handle2.dispatchRemove(entity2)
    received2to1.join()
    assertThat(handle1.dispatchSize()).isEqualTo(2)
    assertThat(handle1.dispatchIsEmpty()).isEqualTo(false)
    assertThat(handle1.dispatchFetchAll()).containsExactly(entity1, entity3)
    assertThat(handle2.dispatchFetchById(entity1.entityId!!)).isEqualTo(entity1)
    assertThat(handle2.dispatchFetchById(entity2.entityId!!)).isNull()
    assertThat(handle2.dispatchFetchById(entity3.entityId!!)).isEqualTo(entity3)

    // Verify that handle1 sees an empty collection after a clear op from handle2.
    received2to1 = Job()
    size2to1 = 0
    handle2.dispatchClear()
    received2to1.join()
    assertThat(handle1.dispatchSize()).isEqualTo(0)
    assertThat(handle1.dispatchIsEmpty()).isEqualTo(true)
    assertThat(handle1.dispatchFetchAll()).isEmpty()
    assertThat(handle2.dispatchFetchById(entity1.entityId!!)).isNull()
    assertThat(handle2.dispatchFetchById(entity2.entityId!!)).isNull()
    assertThat(handle2.dispatchFetchById(entity3.entityId!!)).isNull()
  }

  @Test
  fun collection_writeMutatedEntityReplaces() = testRunner {
    val entity = TestParticle_Entities(text = "Hello")
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)
    handle.dispatchStore(entity)
    assertThat(handle.dispatchFetchAll()).containsExactly(entity)

    val modified = entity.mutate(text = "Changed")
    assertThat(modified).isNotEqualTo(entity)

    // Entity internals should not change.
    assertThat(modified.entityId).isEqualTo(entity.entityId)
    assertThat(modified.creationTimestamp).isEqualTo(entity.creationTimestamp)
    assertThat(modified.expirationTimestamp).isEqualTo(entity.expirationTimestamp)

    handle.dispatchStore(modified)
    assertThat(handle.dispatchFetchAll()).containsExactly(modified)
    assertThat(handle.dispatchFetchById(entity.entityId!!)).isEqualTo(modified)
  }

  @Test
  fun collection_writeMutatedInlineEntitiesReplaces() = testRunner {
    val inline = TestInlineParticle_Entities_Inline(32L, "inlineString")
    val inlineSet = setOf(
      TestInlineParticle_Entities_Inlines(10),
      TestInlineParticle_Entities_Inlines(20),
      TestInlineParticle_Entities_Inlines(30)
    )
    val inlineList = listOf(
      TestInlineParticle_Entities_InlineList(
        setOf(
          TestInlineParticle_Entities_InlineList_MostInline("so inline")
        )
      ),
      TestInlineParticle_Entities_InlineList(
        setOf(
          TestInlineParticle_Entities_InlineList_MostInline("very inline")
        )
      )
    )
    val entity = TestInlineParticle_Entities(inline, inlineSet, inlineList)
    val handle = writeHandleManagerImpl.createCollectionHandle(
      entitySpec = TestInlineParticle_Entities
    )
    handle.dispatchStore(entity)

    val modified = entity.mutate(
      inline_ = TestInlineParticle_Entities_Inline(33L, "inlineString2"),
      inlines = setOf(
        TestInlineParticle_Entities_Inlines(11),
        TestInlineParticle_Entities_Inlines(22),
        TestInlineParticle_Entities_Inlines(33)
      ),
      inlineList = listOf(
        TestInlineParticle_Entities_InlineList(
          setOf(
            TestInlineParticle_Entities_InlineList_MostInline("so inline v2")
          )
        ),
        TestInlineParticle_Entities_InlineList(
          setOf(
            TestInlineParticle_Entities_InlineList_MostInline("very inline v2")
          )
        )
      )
    )
    handle.dispatchStore(modified)

    assertThat(handle.dispatchFetchAll()).containsExactly(modified)
  }

  @Test
  fun listsWorkEndToEnd() = testRunner {
    val entity = TestParticle_Entities(
      text = "Hello",
      number = 1.0,
      list = listOf(1L, 2L, 4L, 2L)
    )
    val writeHandle = writeHandleManagerImpl.createCollectionHandle(
      entitySpec = TestParticle_Entities
    )
    val readHandle = readHandleManagerImpl.createCollectionHandle(
      entitySpec = TestParticle_Entities
    )

    val updateDeferred = readHandle.onUpdateDeferred { it.size() == 1 }
    writeHandle.dispatchStore(entity)
    updateDeferred.join()
    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity)
  }

  @Test
  fun inlineEntitiesWorkEndToEnd() = testRunner {
    val inline = TestInlineParticle_Entities_Inline(32L, "inlineString")
    val inlineSet = setOf(
      TestInlineParticle_Entities_Inlines(10),
      TestInlineParticle_Entities_Inlines(20),
      TestInlineParticle_Entities_Inlines(30)
    )
    val inlineList = listOf(
      TestInlineParticle_Entities_InlineList(
        setOf(
          TestInlineParticle_Entities_InlineList_MostInline("so inline"),
          TestInlineParticle_Entities_InlineList_MostInline("like")
        )
      ),
      TestInlineParticle_Entities_InlineList(
        setOf(
          TestInlineParticle_Entities_InlineList_MostInline("very"),
          TestInlineParticle_Entities_InlineList_MostInline("very inline")
        )
      )
    )
    val entity = TestInlineParticle_Entities(inline, inlineSet, inlineList)

    val writeHandle = writeHandleManagerImpl.createCollectionHandle(
      entitySpec = TestInlineParticle_Entities
    )
    val readHandle = readHandleManagerImpl.createCollectionHandle(
      entitySpec = TestInlineParticle_Entities
    )

    val updateDeferred = readHandle.onUpdateDeferred { it.size() == 1 }
    writeHandle.dispatchStore(entity)
    updateDeferred.join()
    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity)
  }

  @Test
  fun collectionsOfReferencesWorkEndToEnd() = testRunner {
    fun toReferencedEntity(value: Int) = TestReferencesParticle_Entities_References(value)

    val referencedEntitiesKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("referencedEntities"),
      storageKey = RamDiskStorageKey("set-referencedEntities")
    )

    val referencedEntityHandle = writeHandleManagerImpl.createCollectionHandle(
      referencedEntitiesKey,
      entitySpec = TestReferencesParticle_Entities_References
    )

    suspend fun toReferences(values: Iterable<Int>) = values
      .map { toReferencedEntity(it) }
      .map {
        referencedEntityHandle.dispatchStore(it)
        referencedEntityHandle.dispatchCreateReference(it)
      }

    suspend fun toEntity(values: Set<Int>, valueList: List<Int>) =
      TestReferencesParticle_Entities(
        toReferences(values).toSet(),
        toReferences(valueList)
      )

    val entities = setOf(
      toEntity(setOf(1, 2, 3), listOf(3, 3, 4)),
      toEntity(setOf(200, 100, 300), listOf(2, 10, 2)),
      toEntity(setOf(34, 2145, 1, 11), listOf(3, 4, 5))
    )

    val writeHandle = writeHandleManagerImpl.createCollectionHandle(
      entitySpec = TestReferencesParticle_Entities
    )
    val readHandle = readHandleManagerImpl.createCollectionHandle(
      entitySpec = TestReferencesParticle_Entities
    )

    val updateDeferred = readHandle.onUpdateDeferred { it.size() == 3 }
    entities.forEach { writeHandle.dispatchStore(it) }
    updateDeferred.join()
    val entitiesOut = readHandle.dispatchFetchAll()
    assertThat(entitiesOut).containsExactlyElementsIn(entities)
    entitiesOut.forEach { entity ->
      entity.references.forEach { it.dereference() }
      entity.referenceList.forEach { it.dereference() }
    }
  }

  @Test
  fun clientCanSetEntityId() = testRunner {
    fakeTime.millis = 0
    // Ask faketime to increment to test with changing timestamps.
    fakeTime.autoincrement = 1
    val id = "MyId"
    val entity = TestParticle_Entities(text = "Hello", number = 1.0, entityId = id)
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)
    handle.dispatchStore(entity)
    assertThat(handle.dispatchFetchAll()).containsExactly(entity)

    // A different entity, with the same ID, should replace the first.
    val entity2 = TestParticle_Entities(text = "New Hello", number = 1.1, entityId = id)
    handle.dispatchStore(entity2)
    assertThat(handle.dispatchFetchAll()).containsExactly(entity2)
    // Timestamps also get updated.
    assertThat(entity2.creationTimestamp).isEqualTo(2)

    // An entity with a different ID.
    val entity3 = TestParticle_Entities(text = "Bye", number = 2.0, entityId = "OtherId")
    handle.dispatchStore(entity3)
    assertThat(handle.dispatchFetchAll()).containsExactly(entity3, entity2)
  }

  @Test
  fun clientCanSetCreationTimestamp() = testRunner {
    fakeTime.millis = 100
    val creationTime = 20L
    val entity = TestParticle_Entities(
      text = "Hello",
      number = 1.0,
      creationTimestamp = creationTime
    )
    val handle = writeHandleManagerImpl.createCollectionHandle(entitySpec = TestParticle_Entities)
    handle.dispatchStore(entity)

    assertThat(handle.dispatchFetchAll()).containsExactly(entity)
    assertThat(entity.creationTimestamp).isEqualTo(20)

    // A different entity that reuses the same creation timestamp.
    val entity2 = TestParticle_Entities(
      text = "New Hello",
      number = 1.1,
      creationTimestamp = entity.creationTimestamp
    )
    handle.dispatchStore(entity2)

    assertThat(handle.dispatchFetchAll()).containsExactly(entity, entity2)
    assertThat(entity2.creationTimestamp).isEqualTo(20)
  }

  @Test
  fun collection_entityDereference() = testRunner {
    // Arrange: reference handle.
    val friendsStorageKey = ReferenceModeStorageKey(backingKey, RamDiskStorageKey("friends"))
    val friendsHandle =
      writeHandleManagerImpl.createCollectionHandle(
        storageKey = friendsStorageKey,
        entitySpec = Friend
      )
    val friend1 = Friend("1")
    friendsHandle.dispatchStore(friend1)

    // Arrange: entity handle.
    val writeHandle = writeHandleManagerImpl.createCollectionHandle()
    val readHandle = readHandleManagerImpl.createCollectionHandle()
    val monitorHandle = monitorHandleManagerImpl.createCollectionHandle()
    val monitorInitialized = monitorHandle.onUpdateDeferred { it.size() == 1 }
    val readUpdated = readHandle.onUpdateDeferred { it.size() == 1 }

    // Act.
    writeHandle.dispatchStore(
      entity1.mutate(bestFriend = friendsHandle.dispatchCreateReference(friend1))
    )
    log("wrote entity1 to writeHandle")
    monitorInitialized.join()
    readUpdated.join()
    log("readHandle and the ramDisk have heard of the update")

    // Assert: read back entity1, and dereference its best_friend.
    log("Checking entity1's best friend")
    val dereferencedFriend = readHandle.dispatchFetchAll().single().bestFriend!!.dereference()!!
    assertThat(dereferencedFriend).isEqualTo(friend1)
  }

  @Test
  fun collection_dereferenceEntity_nestedReference() = testRunner {
    // Create a stylish new hat, and create a reference to it.
    val hatSpec = HandleSpec(
      "hatCollection",
      HandleMode.ReadWrite,
      CollectionType(EntityType(Hat.SCHEMA)),
      Hat
    )
    val hatCollection = writeHandleManagerImpl.createHandle(
      hatSpec,
      hatCollectionKey
    ).awaitReady() as ReadWriteCollectionHandle<Hat>
    val hatMonitor = monitorHandleManagerImpl.createHandle(
      hatSpec,
      hatCollectionKey
    ).awaitReady() as ReadWriteCollectionHandle<Hat>
    val writeHandle = writeHandleManagerImpl.createCollectionHandle()
    val readHandle = readHandleManagerImpl.createCollectionHandle()

    val fez = Hat(entityId = "fez-id", style = "fez")
    val hatMonitorKnows = hatMonitor.onUpdateDeferred {
      it.fetchAll().find { hat -> hat.entityId == "fez-id" } != null
    }
    hatCollection.dispatchStore(fez)
    val fezRef = hatCollection.dispatchCreateReference(fez)

    // Give the hat to an entity and store it.
    val personWithHat = Person(
      entityId = "a-hatted-individual",
      name = "Jason",
      age = 25.0,
      bestFriend = null,
      coolnessIndex = CoolnessIndex(
        pairsOfShoesOwned = 10,
        isCool = true,
        hat = fezRef
      )
    )
    val readHandleKnows = readHandle.onUpdateDeferred {
      it.fetchAll().find { person -> person.entityId == "a-hatted-individual" } != null
    }
    writeHandle.dispatchStore(personWithHat)

    // Read out the entity, and fetch its hat.
    readHandleKnows.join()
    val entityOut = readHandle.dispatchFetchAll().single {
      it.entityId == "a-hatted-individual"
    }
    val hatRef = entityOut.coolnessIndex.hat!!
    assertThat(hatRef).isEqualTo(fezRef)

    hatMonitorKnows.join()
    val hat = hatRef.dereference()!!
    assertThat(hat).isEqualTo(fez)
  }

  @Test
  fun collection_noTTL() = testRunner {
    val monitor = monitorHandleManagerImpl.createCollectionHandle()
    val handle = writeHandleManagerImpl.createCollectionHandle()
    val handleB = readHandleManagerImpl.createCollectionHandle()
    val handleBChanged = handleB.onUpdateDeferred()
    val monitorNotified = monitor.onUpdateDeferred()

    val expectedCreateTime = 123456789L
    fakeTime.millis = expectedCreateTime

    handle.dispatchStore(entity1)
    monitorNotified.join()
    handleBChanged.join()

    val readBack = handleB.dispatchFetchAll().first { it.entityId == entity1.entityId }
    assertThat(readBack.creationTimestamp).isEqualTo(expectedCreateTime)
    assertThat(readBack.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
  }

  @Test
  fun collection_withTTL() = testRunner {
    fakeTime.millis = 0
    val handle = writeHandleManagerImpl.createCollectionHandle(ttl = Ttl.Days(2))
    val handleB = readHandleManagerImpl.createCollectionHandle()
    var handleBChanged = handleB.onUpdateDeferred()
    handle.dispatchStore(entity1)
    handleBChanged.join()

    val readBack = handleB.dispatchFetchAll().first { it.entityId == entity1.entityId }
    assertThat(readBack.creationTimestamp).isEqualTo(0)
    assertThat(readBack.expirationTimestamp).isEqualTo(2 * 24 * 3600 * 1000)

    val handleC = readHandleManagerImpl.createCollectionHandle(ttl = Ttl.Minutes(2))
    handleBChanged = handleB.onUpdateDeferred()
    handleC.dispatchStore(entity2)
    handleBChanged.join()
    val readBack2 = handleB.dispatchFetchAll().first { it.entityId == entity2.entityId }
    assertThat(readBack2.creationTimestamp).isEqualTo(0)
    assertThat(readBack2.expirationTimestamp).isEqualTo(2 * 60 * 1000)

    // Fast forward time to 5 minutes later, so entity2 expires, entity1 doesn't.
    fakeTime.millis += 5 * 60 * 1000
    assertThat(handleB.dispatchSize()).isEqualTo(1)
    assertThat(handleB.dispatchFetchAll()).containsExactly(entity1)
  }

  @Test
  fun referenceCollection_withTtl() = testRunner {
    fakeTime.millis = 0
    val entityHandle = writeHandleManagerImpl.createCollectionHandle()
    val refHandle = writeHandleManagerImpl.createReferenceCollectionHandle(ttl = Ttl.Minutes(2))

    // Create and store an entity with no TTL.
    val updated = entityHandle.onUpdateDeferred()
    entityHandle.dispatchStore(entity1)
    updated.join()

    // Create and store a reference with TTL.
    val entity1Ref = entityHandle.dispatchCreateReference(entity1)
    refHandle.dispatchStore(entity1Ref)
    val readBack = refHandle.dispatchFetchAll().first()
    assertThat(readBack.creationTimestamp).isEqualTo(0)
    assertThat(readBack.expirationTimestamp).isEqualTo(2 * 60 * 1000)

    // Fast forward time to 5 minutes later, so the reference expires.
    fakeTime.millis += 5 * 60 * 1000
    assertThat(refHandle.dispatchFetchAll()).isEmpty()
    assertThat(refHandle.dispatchSize()).isEqualTo(0)
  }

  @Test
  fun collection_addingToA_showsUpInQueryOnB() = testRunner {
    val writeHandle = writeHandleManagerImpl.createCollectionHandle(
      entitySpec = TestParticle_Entities
    )
    val readHandle = readHandleManagerImpl.createCollectionHandle(
      entitySpec = TestParticle_Entities
    )
    val entity1 = TestParticle_Entities(text = "21.0")
    val entity2 = TestParticle_Entities(text = "22.0")
    val readUpdatedTwice = readHandle.onUpdateDeferred { it.size() == 2 }
    writeHandle.dispatchStore(entity1, entity2)
    readUpdatedTwice.join()

    // Ensure that the query argument is being used.
    assertThat(readHandle.dispatchQuery("21.0")).containsExactly(entity1)
    assertThat(readHandle.dispatchQuery("22.0")).containsExactly(entity2)

    // Ensure that an empty set of results can be returned.
    assertThat(readHandle.dispatchQuery("60.0")).isEmpty()
  }

  @Test
  fun collection_dataConsideredInvalidByRefinementThrows() = testRunner {
    val timeTraveler = Person(
      "the Doctor",
      -900.0,
      entityId = "doctor1",
      coolnessIndex = CoolnessIndex(pairsOfShoesOwned = 0, isCool = false)
    )
    val handle = writeHandleManagerImpl.createCollectionHandle()
    handle.dispatchStore(entity1, entity2)

    assertThat(handle.dispatchFetchAll()).containsExactly(entity1, entity2)

    assertSuspendingThrows(IllegalArgumentException::class) {
      handle.dispatchStore(timeTraveler)
    }
  }

  @Test
  @Ignore("Need to patch ExpressionEvaluator to check types")
  fun collection_queryWithInvalidQueryThrows() = testRunner {
    val handle = writeHandleManagerImpl.createCollectionHandle()
    handle.dispatchStore(entity1, entity2)

    assertThat(handle.dispatchFetchAll()).containsExactly(entity1, entity2)
    // Ensure that queries can be performed.
    (handle as ReadWriteQueryCollectionHandle<Person, Double>).dispatchQuery(44.0)
    // Ensure that queries can be performed.
    assertSuspendingThrows(ClassCastException::class) {
      (handle as ReadWriteQueryCollectionHandle<Person, String>).dispatchQuery("44")
    }
  }

  @Test
  fun collection_referenceLiveness() = testRunner {
    // Create and store some entities.
    val writeEntityHandle = writeHandleManagerImpl.createCollectionHandle()
    val monitorHandle = monitorHandleManagerImpl.createCollectionHandle()
    monitorHandle.onUpdate {
      log("Monitor Handle: $it")
    }
    val monitorSawEntities = monitorHandle.onUpdateDeferred {
      it.size() == 2
    }
    writeEntityHandle.dispatchStore(entity1, entity2)

    // Wait for the monitor to see the entities (monitor handle is on a separate storage proxy
    // with a separate stores-cache, so it requires the entities to have made it to the storage
    // media.
    monitorSawEntities.join()

    // Create a store a reference to the entity.
    val entity1Ref = writeEntityHandle.dispatchCreateReference(entity1)
    val entity2Ref = writeEntityHandle.dispatchCreateReference(entity2)
    val writeRefHandle = writeHandleManagerImpl.createReferenceCollectionHandle()
    val readRefHandle = readHandleManagerImpl.createReferenceCollectionHandle()
    val refWritesHappened = readRefHandle.onUpdateDeferred {
      log("References created so far: $it")
      it.size() == 2
    }
    writeRefHandle.dispatchStore(entity1Ref, entity2Ref)

    // Now read back the references from a different handle.
    refWritesHappened.join()
    var references = readRefHandle.dispatchFetchAll()
    assertThat(references).containsExactly(entity1Ref, entity2Ref)

    // References should be alive.
    assertThat(references.map { it.dereference() }).containsExactly(entity1, entity2)
    references.forEach {
      val storageReference = it.toReferencable()
      assertThat(storageReference.isAlive()).isTrue()
      assertThat(storageReference.isDead()).isFalse()
    }

    // Modify the entities.
    val modEntity1 = entity1.mutate(name = "Ben")
    val modEntity2 = entity2.mutate(name = "Ben")
    val entitiesWritten = monitorHandle.onUpdateDeferred {
      log("Heard update with $it")
      it.fetchAll().all { person -> person.name == "Ben" }
    }
    writeEntityHandle.dispatchStore(modEntity1, modEntity2)
    entitiesWritten.join()

    // Reference should still be alive.
    references = readRefHandle.dispatchFetchAll()
    assertThat(references.map { it.dereference() }).containsExactly(modEntity1, modEntity2)
    references.forEach {
      val storageReference = it.toReferencable()
      assertThat(storageReference.isAlive()).isTrue()
      assertThat(storageReference.isDead()).isFalse()
    }

    log("Removing the entities")

    // Remove the entities from the collection.
    val entitiesDeleted = monitorHandle.onUpdateDeferred { it.isEmpty() }
    writeEntityHandle.dispatchRemove(entity1, entity2)
    entitiesDeleted.join()

    log("Checking that they are empty when de-referencing.")

    // Reference should be dead. (Removed entities currently aren't actually deleted, but
    // instead are "nulled out".)
    assertThat(references.map { it.toReferencable().dereference() }).containsExactly(
      createNulledOutPerson("entity1"),
      createNulledOutPerson("entity2")
    )
  }

  @Test
  fun collection_referenceHandle_referenceModeNotSupported() = testRunner {
    val e = assertSuspendingThrows(IllegalArgumentException::class) {
      writeHandleManagerImpl.createReferenceCollectionHandle(
        ReferenceModeStorageKey(
          backingKey = backingKey,
          storageKey = collectionRefKey
        )
      )
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Reference-mode storage keys are not supported for reference-typed handles."
    )
  }

  @Test
  fun arcsStrictMode_handle_operation_fails() = testRunner {
    val handle = writeHandleManagerImpl.createCollectionHandle()
    ArcsStrictMode.enableStrictHandlesForTest {
      assertFailsWith<IllegalStateException> {
        handle.clear()
      }
    }
  }

  private suspend fun <T : Entity> HandleManagerImpl.createSingletonHandle(
    storageKey: StorageKey = singletonKey,
    name: String = "singletonWriteHandle",
    ttl: Ttl = Ttl.Infinite(),
    entitySpec: EntitySpec<T>
  ) = createHandle(
    HandleSpec(
      name,
      HandleMode.ReadWrite,
      SingletonType(EntityType(entitySpec.SCHEMA)),
      entitySpec
    ),
    storageKey,
    ttl
  ).awaitReady() as ReadWriteSingletonHandle<T>

  private suspend fun HandleManagerImpl.createSingletonHandle(
    storageKey: StorageKey = singletonKey,
    name: String = "singletonWriteHandle",
    ttl: Ttl = Ttl.Infinite()
  ) = createSingletonHandle(storageKey, name, ttl, Person)

  private suspend fun HandleManagerImpl.createCollectionHandle(
    storageKey: StorageKey = collectionKey,
    name: String = "collectionReadHandle",
    ttl: Ttl = Ttl.Infinite()
  ) = createCollectionHandle(storageKey, name, ttl, Person)

  private suspend fun <T : Entity> HandleManagerImpl.createCollectionHandle(
    storageKey: StorageKey = collectionKey,
    name: String = "collectionReadHandle",
    ttl: Ttl = Ttl.Infinite(),
    entitySpec: EntitySpec<T>
  ) = createHandle(
    HandleSpec(
      name,
      HandleMode.ReadWriteQuery,
      CollectionType(EntityType(entitySpec.SCHEMA)),
      entitySpec
    ),
    storageKey,
    ttl
  ).awaitReady() as ReadWriteQueryCollectionHandle<T, Any>

  private suspend fun HandleManagerImpl.createReferenceSingletonHandle(
    storageKey: StorageKey = singletonRefKey,
    name: String = "referenceSingletonWriteHandle",
    ttl: Ttl = Ttl.Infinite()
  ) = createHandle(
    HandleSpec(
      name,
      HandleMode.ReadWrite,
      SingletonType(ReferenceType(EntityType(Person.SCHEMA))),
      Person
    ),
    storageKey,
    ttl
  ).awaitReady() as ReadWriteSingletonHandle<Reference<Person>>

  private suspend fun HandleManagerImpl.createReferenceCollectionHandle(
    storageKey: StorageKey = collectionRefKey,
    name: String = "referenceCollectionReadHandle",
    ttl: Ttl = Ttl.Infinite()
  ) = createHandle(
    HandleSpec(
      name,
      HandleMode.ReadWriteQuery,
      CollectionType(ReferenceType(EntityType(Person.SCHEMA))),
      Person
    ),
    storageKey,
    ttl
  ).also { it.awaitReady() } as ReadWriteQueryCollectionHandle<Reference<Person>, Any>

  // Note the predicate receives the *handle*, not onUpdate's delta argument.
  private fun <H : ReadableHandle<T, U>, T, U> H.onUpdateDeferred(
    predicate: (H) -> Boolean = { true }
  ) = Job().also { deferred ->
    onUpdate {
      if (deferred.isActive && predicate(this)) {
        deferred.complete()
      }
    }
  }

  private fun createNulledOutPerson(entityId: ReferenceId) = RawEntity(
    id = entityId,
    singletons = mapOf(
      "name" to null,
      "age" to null,
      "bestFriend" to null,
      "favoriteWords" to null,
      "coolnessIndex" to null
    ),
    collections = emptyMap(),
    creationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP,
    expirationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP
  )
}
