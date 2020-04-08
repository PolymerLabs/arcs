package arcs.android.entity

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.data.HandleMode
import arcs.core.data.Ttl
import arcs.core.entity.DummyEntity
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.SchemaRegistry
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Time
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class TtlHandleTest() {

    private val backingKey = DatabaseStorageKey.Persistent("entities-backing", DummyEntity.SCHEMA_HASH)
    private val collectionKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = DatabaseStorageKey.Persistent("collection", DummyEntity.SCHEMA_HASH)
    )
    private val singletonKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = DatabaseStorageKey.Persistent("singleton", DummyEntity.SCHEMA_HASH)
    )
    private lateinit var databaseManager: AndroidSqliteDatabaseManager
    
    @Before
    fun setUp() {
        databaseManager = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        DriverAndKeyConfigurator.configure(databaseManager)
        SchemaRegistry.register(DummyEntity)
    }

    @Test
    fun singletonWithExpiredEntities() = runBlockingTest {
        val time = FakeTime()
        val handle = createSingletonHandle(time)
        val entity1 = DummyEntity().apply {
            num = 1.0
            texts = setOf("1", "one")
        }
        // Set a time in the past. So that this entity is already expired.
        time.millis = 1L
        handle.store(entity1)
        // Then set time to now.
        time.millis = System.currentTimeMillis()

        // TODO: once expired entities are filtered out on read, this should be null.
        assertThat(handle.fetch()).isEqualTo(entity1)
        
        // Simulate periodic job triggering.
        databaseManager.removeExpiredEntities()

        assertThat(handle.fetch()).isEqualTo(null)

        // Creatie a new handle manager with a new storage proxy to confirm entity1 is gone and the
        // singleton is still in a good state.
        val handle2 = createSingletonHandle(time)

        assertThat(handle2.fetch()).isEqualTo(null)
        
        val entity2 = DummyEntity().apply {
            num = 2.0
            texts = setOf("2", "two")
        }
        handle2.store(entity2)
        assertThat(handle2.fetch()).isEqualTo(entity2)
        handle2.clear()
        assertThat(handle2.fetch()).isNull()
    }

    @Test
    fun collectionWithExpiredEntities() = runBlockingTest {
        val time = FakeTime()
        val handle = createCollectionHandle(time)
        val entity1 = DummyEntity().apply {
            num = 1.0
            texts = setOf("1", "one")
        }
        // Set a time in the past. So that this entity is already expired.
        time.millis = 1L
        handle.store(entity1)
        // Then set time to now.
        time.millis = System.currentTimeMillis()

        val entity2 = DummyEntity().apply {
            num = 2.0
            texts = setOf("2", "two")
        }
        handle.store(entity2)

        // TODO: after expired entities are filtered out on read, this should only contain entity2.
        assertThat(handle.fetchAll()).containsExactly(entity1, entity2)
        
        // Simulate periodic job triggering.
        databaseManager.removeExpiredEntities()

        assertThat(handle.fetchAll()).containsExactly(entity2)

        val entity3 = DummyEntity().apply {
            num = 3.0
            texts = setOf("3", "three")
        }
        handle.store(entity3)
        assertThat(handle.fetchAll()).containsExactly(entity2, entity3)

        // Creatie a new handle manager with a new storage proxy to confirm entity1 is gone and the
        // collection is still in a good state.
        val handle2 = createCollectionHandle(time)
        
        assertThat(handle2.fetchAll()).containsExactly(entity2, entity3)
        
        val entity4 = DummyEntity().apply {
            num = 4.0
            texts = setOf("4", "four")
        }
        handle2.store(entity4)
        assertThat(handle2.fetchAll()).containsExactly(entity2, entity3, entity4)
    }

    @Test
    fun sameEntityInTwoCollections() = runBlockingTest {
        val time = FakeTime()
        
        val entity1 = DummyEntity().apply { num = 1.0 }
        val entity2 = DummyEntity().apply { num = 2.0 }
        val entity3 = DummyEntity().apply { num = 3.0 }
        val entity4 = DummyEntity().apply { num = 4.0 }

        val handle1 = createCollectionHandle(time, Ttl.Minutes(1))
        // A separate collection with the same backing store.
        val collectionKey2 = ReferenceModeStorageKey(
            backingKey = backingKey,
            storageKey = DatabaseStorageKey.Persistent("collection2", DummyEntity.SCHEMA_HASH)
        )
        val handle2 = createCollectionHandle(time, Ttl.Minutes(2), collectionKey2)
        
        // Entities in handle1 are expired.
        time.millis = 1L
        handle1.store(entity1)
        handle1.store(entity2)
        
        // Entities in handle2 are not expired.
        time.millis = System.currentTimeMillis()
        handle2.store(entity1)
        handle2.store(entity3)
        handle2.store(entity4)
        
        time.millis = 1L
        handle1.store(entity4)
        
        // Simulate periodic job triggering.
        databaseManager.removeExpiredEntities()
        // Entity4 is present because it was first stored through handle2.
        assertThat(handle1.fetchAll()).containsExactly(entity4)
        // Entity1 is gone because it was first stored through handle1.
        assertThat(handle2.fetchAll()).containsExactly(entity3, entity4)
    }

    private suspend fun createCollectionHandle(
            time: Time,
            ttl: Ttl = Ttl.Hours(1),
            key: StorageKey = collectionKey
        ) =
        EntityHandleManager(time = time).createHandle(
            HandleSpec(
                "name",
                HandleMode.ReadWrite,
                HandleContainerType.Collection,
                DummyEntity
            ),
            key,
            ttl
        ) as ReadWriteCollectionHandle<DummyEntity>

    private suspend fun createSingletonHandle(time: Time) =
        EntityHandleManager(time = time).createHandle(
            HandleSpec(
                "name",
                HandleMode.ReadWrite,
                HandleContainerType.Singleton,
                DummyEntity
            ),
            singletonKey,
            Ttl.Hours(1)
        ) as ReadWriteSingletonHandle<DummyEntity>
}
