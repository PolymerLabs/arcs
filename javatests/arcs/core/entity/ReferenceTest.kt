package arcs.core.entity

import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.util.toReferencable
import arcs.core.host.EntityHandleManager
import arcs.core.storage.DriverFactory
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.RawEntityDereferencer
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.util.concurrent.Executors

@RunWith(JUnit4::class)
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
@Suppress("UNCHECKED_CAST")
class ReferenceTest {
    private val scheduler = Scheduler(
        FakeTime(),
        Executors.newSingleThreadExecutor().asCoroutineDispatcher()
    )
    private val dereferencer = RawEntityDereferencer(DummyEntity.SCHEMA, scheduler = scheduler)
    private val entityHandleManager = EntityHandleManager(
        "testArc",
        "",
        FakeTime(),
        scheduler = scheduler
    )

    private lateinit var handle: ReadWriteCollectionHandle<DummyEntity>

    private val STORAGE_KEY = ReferenceModeStorageKey(
        RamDiskStorageKey("backing"),
        RamDiskStorageKey("collection")
    )

    @Before
    fun setUp() = runBlocking {
        DriverAndKeyConfigurator.configure(null)
        SchemaRegistry.register(DummyEntity.SCHEMA)

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
    fun tearDown() {
        SchemaRegistry.clearForTest()
        DriverFactory.clearRegistrations()
    }

    @Test
    fun dereference() = runBlocking {
        val entity = DummyEntity().apply {
            text = "Watson"
            num = 6.0
        }
        handle.store(entity)

        val reference = handle.createReference(entity)
        val entityOut = reference.dereference()

        assertThat(entityOut).isEqualTo(entity)
    }

    @Test
    fun missingEntity_returnsNull() = runBlocking {
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
