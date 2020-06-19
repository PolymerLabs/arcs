package arcs.core.entity

import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.host.EntityHandleManager
import arcs.core.storage.DriverFactory
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.RawEntityDereferencer
import arcs.core.storage.StoreManager
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.runTest
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asCoroutineDispatcher
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.util.concurrent.Executors

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
class ReferenceTest {
    @get:Rule
    val log = LogRule()

    private lateinit var scheduler: Scheduler
    private lateinit var dereferencer: RawEntityDereferencer
    private lateinit var entityHandleManager: EntityHandleManager
    private lateinit var stores: StoreManager
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

        scheduler = Scheduler(Executors.newSingleThreadExecutor().asCoroutineDispatcher())
        stores = StoreManager()
        dereferencer = RawEntityDereferencer(
            DummyEntity.SCHEMA,
            scheduler = scheduler,
            storeManager = stores
        )
        entityHandleManager = EntityHandleManager(
            "testArc",
            "",
            FakeTime(),
            scheduler = scheduler,
            stores = stores
        )

        handle = entityHandleManager.createHandle(
            HandleSpec(
                "testHandle",
                HandleMode.ReadWrite,
                HandleContainerType.Collection,
                DummyEntity
            ),
            STORAGE_KEY
        ) as ReadWriteCollectionHandle<DummyEntity>
    }

    @After
    fun tearDown() = runTest {
        scheduler.waitForIdle()
        stores.waitForIdle()
        entityHandleManager.close()
        scheduler.cancel()

        SchemaRegistry.clearForTest()
        DriverFactory.clearRegistrations()
    }

    @Test
    fun dereference() = runTest(handle.dispatcher) {
        val entity = DummyEntity().apply {
            text = "Watson"
            num = 6.0
        }
        handle.store(entity).join()

        val reference = handle.createReference(entity)
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
