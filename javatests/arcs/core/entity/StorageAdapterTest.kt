package arcs.core.entity

import arcs.core.common.Id
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.data.Ttl
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.StoreManager
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.EmptyCoroutineContext
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class StorageAdapterTest {

    private val time = FakeTime()
    private val scheduler = Scheduler(EmptyCoroutineContext)
    private val dereferencerFactory = EntityDereferencerFactory(StoreManager(), scheduler)
    private val idGenerator = Id.Generator.newForTest("session")

    @Before
    fun setUp() {
        SchemaRegistry.register(DummyEntity.SCHEMA)
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
    fun isExpiredEntity() {
        val adapter = EntityStorageAdapter(
            "name",
            idGenerator,
            DummyEntity,
            Ttl.Minutes(1),
            time,
            dereferencerFactory
        )
        val entity = DummyEntity().apply { text = "Watson" }
        // This call sets the timestamps.
        adapter.storableToReferencable(entity)
        assertThat(entity.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60_000)

        assertThat(adapter.isExpired(entity)).isFalse()
        time.millis += 60_001
        assertThat(adapter.isExpired(entity)).isTrue()
    }

    @Test
    fun referenceStorageAdapter() {
        val adapter = ReferenceStorageAdapter(DummyEntity, dereferencerFactory, Ttl.Minutes(1), time)
        val storageReference = StorageReference(
            "id",
            DummyStorageKey("storage-key"),
            VersionMap("a" to 1)
        )
        val reference = Reference(DummyEntity, storageReference)

        // Convert to storage format (StorageReference).
        val referencable = adapter.storableToReferencable(reference)
        assertThat(referencable).isEqualTo(storageReference)
        assertThat(referencable.creationTimestamp).isEqualTo(time.currentTimeMillis)
        assertThat(referencable.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60000)

        // Convert back from storage format again.
        val convertBack = adapter.referencableToStorable(storageReference)
        assertThat(convertBack).isEqualTo(reference)
        assertThat(convertBack.creationTimestamp).isEqualTo(time.currentTimeMillis)
        assertThat(convertBack.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60000)
    }

    @Test
    fun isExpiredReference() {
        val adapter = ReferenceStorageAdapter(DummyEntity, dereferencerFactory, Ttl.Minutes(1), time)
        val storageReference = StorageReference(
            "id",
            DummyStorageKey("storage-key"),
            VersionMap("a" to 1)
        )
        val reference = Reference(DummyEntity, storageReference)
        // This sets the timestamps.
        adapter.storableToReferencable(reference)
        assertThat(reference.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60_000)

        assertThat(adapter.isExpired(reference)).isFalse()
        time.millis += 60_001
        assertThat(adapter.isExpired(reference)).isTrue()
    }
}
