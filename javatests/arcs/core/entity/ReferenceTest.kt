package arcs.core.entity

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaRegistry
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.InlineDummyEntity
import arcs.core.host.HandleManagerImpl
import arcs.core.storage.RawEntityDereferencer
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchStore
import arcs.core.testutil.runTest
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.Executors
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asCoroutineDispatcher
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
class ReferenceTest {
  @get:Rule
  val log = LogRule()

  private lateinit var scheduler: Scheduler
  private lateinit var dereferencer: RawEntityDereferencer
  private lateinit var handleManagerImpl: HandleManagerImpl
  private lateinit var handle: ReadWriteCollectionHandle<DummyEntity>

  private val STORAGE_KEY = ReferenceModeStorageKey(
    RamDiskStorageKey("backing"),
    RamDiskStorageKey("collection")
  )

  @Before
  fun setUp() = runTest {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
    SchemaRegistry.register(DummyEntity.SCHEMA)
    SchemaRegistry.register(InlineDummyEntity.SCHEMA)

    scheduler = Scheduler(Executors.newSingleThreadExecutor().asCoroutineDispatcher())
    val storageEndpointManager = testStorageEndpointManager()
    dereferencer = RawEntityDereferencer(DummyEntity.SCHEMA, storageEndpointManager)
    handleManagerImpl = HandleManagerImpl(
      "testArc",
      "",
      FakeTime(),
      scheduler = scheduler,
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )

    handle = handleManagerImpl.createHandle(
      HandleSpec(
        "testHandle",
        HandleMode.ReadWrite,
        CollectionType(EntityType(DummyEntity.SCHEMA)),
        DummyEntity
      ),
      STORAGE_KEY
    ) as ReadWriteCollectionHandle<DummyEntity>
  }

  @After
  fun tearDown() = runTest {
    scheduler.waitForIdle()
    handleManagerImpl.close()
    scheduler.cancel()

    SchemaRegistry.clearForTest()
  }

  @Test
  fun dereference() = runTest {
    val entity = DummyEntity().apply {
      text = "Watson"
      num = 6.0
    }
    handle.dispatchStore(entity)

    val reference = handle.dispatchCreateReference(entity)
    val entityOut = reference.dereference()

    assertThat(entityOut).isEqualTo(entity)
  }

  @Test
  fun missingEntity_returnsNull() = runTest {
    val reference = createReference("id", "key", DummyEntity)
    assertThat(reference.dereference()).isNull()
  }

  @Test
  fun equality() {
    val reference = createReference("id", "key", DummyEntity)

    // Same reference should be equal.
    assertThat(reference).isEqualTo(reference)
    assertThat(reference).isEqualTo(createReference("id", "key", DummyEntity))

    // Different IDs, keys should be unequal.
    assertThat(reference).isNotEqualTo(createReference("id2", "key", DummyEntity))
    assertThat(reference).isNotEqualTo(createReference("id", "key2", DummyEntity))

    // Different EntitySpec should be unequal.
    val someOtherSpec = object : EntitySpec<DummyEntity> {
      override fun deserialize(data: RawEntity) = throw NotImplementedError()
      override val SCHEMA: Schema
        get() = DummyEntity.SCHEMA
    }
    assertThat(reference).isNotEqualTo(createReference("id", "key", someOtherSpec))
  }

  private fun createReference(
    entityId: String,
    storageKey: String,
    entitySpec: EntitySpec<*>
  ): Reference<*> {
    val storageReference = StorageReference(
      entityId,
      RamDiskStorageKey(storageKey),
      version = null
    )
    storageReference.dereferencer = dereferencer
    return Reference(entitySpec, storageReference)
  }
}
