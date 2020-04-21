package arcs.core.entity

import arcs.core.common.Id
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.data.Ttl
import arcs.core.data.util.toReferencable
import arcs.core.storage.StoreManager
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.coroutines.EmptyCoroutineContext
import arcs.core.storage.Reference as StorageReference

@RunWith(JUnit4::class)
class StorageAdapterTest {

    private val time = FakeTime()
    private val scheduler = Scheduler(time, EmptyCoroutineContext)
    private val dereferencerFactory = EntityDereferencerFactory(StoreManager(), scheduler)
    private val idGenerator = Id.Generator.newForTest("session")

    @Before
    fun setUp() {
        SchemaRegistry.register(DummyEntity)
    }

    @Test
    fun entityStorageAdapter() {
        val adapter = EntityStorageAdapter(
            "name",
            idGenerator,
            DummyEntity,
            Ttl.Minutes(1),
            time,
            dereferencerFactory
        )
        val entity = DummyEntity().apply { text = "Watson" }

        // Convert to storage format (RawEntity).
        val rawEntity = adapter.storableToReferencable(entity)

        assertThat(entity.entityId).isNotNull()
        assertThat(rawEntity.id).isNotEqualTo(NO_REFERENCE_ID)
        assertThat(rawEntity.creationTimestamp).isEqualTo(time.currentTimeMillis)
        assertThat(rawEntity.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60000)
        assertThat(rawEntity.singletons).containsEntry("text", "Watson".toReferencable())
        assertThat(entity.serialize()).isEqualTo(rawEntity)

        // Convert back from storage format again.
        assertThat(adapter.referencableToStorable(rawEntity)).isEqualTo(entity)
    }

    @Test
    fun referenceStorageAdapter() {
        val adapter = ReferenceStorageAdapter(DummyEntity, dereferencerFactory)
        val storageReference = StorageReference(
            "id",
            DummyStorageKey("storage-key"),
            VersionMap("a" to 1)
        )
        val reference = Reference(DummyEntity, storageReference)

        // Convert to storage format (StorageReference).
        assertThat(adapter.storableToReferencable(reference)).isEqualTo(storageReference)

        // Convert back from storage format again.
        assertThat(adapter.referencableToStorable(storageReference)).isEqualTo(reference)
    }
}
