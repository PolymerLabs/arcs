package arcs.core.entity

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.entity.HandleManagerTestBase.Person
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.lang.IllegalStateException
import kotlin.coroutines.EmptyCoroutineContext

@Suppress("UNCHECKED_CAST")
@RunWith(JUnit4::class)
@kotlinx.coroutines.ExperimentalCoroutinesApi
class HandleManagerCloseTest {

    val scheduler = JvmSchedulerProvider(EmptyCoroutineContext).invoke("test")

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
    fun setup() {
        DriverAndKeyConfigurator.configure(null)
        SchemaRegistry.register(Person.SCHEMA)
        SchemaRegistry.register(HandleManagerTestBase.Hat.SCHEMA)
    }

    fun createHandleManager() = EntityHandleManager("testArc", "", FakeTime(), scheduler)

    @Test
    fun closehandleManagerStopUpdates() = runBlocking {
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

        handleA.store(Person("e1", "p1", 1.0, true)).join()
        updateCalled.join()
        assertThat(updates).isEqualTo(1)

        handleManagerB.close()

        updateCalled = Job()
        handleA.store(Person("e2", "p2", 2.0, true)).join()
        assertSuspendingThrows(TimeoutCancellationException::class) {
            withTimeout(100) {
                updateCalled.join()
            }
        }
        assertThat(updates).isEqualTo(1)
    }

    @Test
    fun singleton_closeHandleManagerThrowsExceptionOnOperations() = runBlocking {
        val handleManager = createHandleManager()

        val handle = handleManager.createSingletonHandle()

        handleManager.close()

        val person = Person("1","p",1.0,true)

        listOf(
            suspend { handle.store(person) },
            suspend { handle.onUpdate {} },
            suspend { handle.onReady {} },
            suspend { handle.onResync{} },
            suspend { handle.onDesync{} },
            suspend { handle.clear() },
            suspend { handle.createReference(person); Unit },
            suspend { handle.fetch(); Unit }
        ).forEach { assertSuspendingThrows(IllegalStateException::class) { it() } }
    }

    @Test
    fun collection_closeHandleManagerThrowsExceptionOnOperations() = runBlocking {
        val handleManager = createHandleManager()

        val handle = handleManager.createCollectionHandle()

        handleManager.close()

        val person = Person("1","p",1.0,true)

        listOf(
            suspend { handle.store(person) },
            suspend { handle.remove(person) },
            suspend { handle.onUpdate {} },
            suspend { handle.onReady {} },
            suspend { handle.onResync {} },
            suspend { handle.onDesync {} },
            suspend { handle.clear() },
            suspend { handle.createReference(person); Unit },
            suspend { handle.fetchAll(); Unit },
            suspend { handle.size(); Unit },
            suspend { handle.isEmpty(); Unit }
        ).forEach { assertSuspendingThrows(IllegalStateException::class) { it() } }
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun EntityHandleManager.createSingletonHandle(
        storageKey: StorageKey = singletonKey,
        name: String = "singletonHandle",
        ttl: Ttl = Ttl.Infinite
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWrite,
            SingletonType(EntityType(Person.SCHEMA)),
            Person
        ),
        storageKey,
        ttl
    ) as ReadWriteSingletonHandle<Person>

    @Suppress("UNCHECKED_CAST")
    private suspend fun EntityHandleManager.createCollectionHandle(
        storageKey: StorageKey = collectionKey,
        name: String = "collecitonKey",
        ttl: Ttl = Ttl.Infinite
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWrite,
            CollectionType(EntityType(Person.SCHEMA)),
            Person
        ),
        storageKey,
        ttl
    ) as ReadWriteCollectionHandle<Person>
}
