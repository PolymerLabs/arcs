package arcs.android.host

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.HandleMode
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.data.RawEntity
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteQueryCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.toPrimitiveValue
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.StoreManager
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.entity.QueryCollectionHandle
import arcs.core.host.EntityHandleManager
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertThrows
import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.coroutines.experimental.suspendCoroutine

// Generated from ./javatests/arcs/android/host/test.arcs
private typealias Person = AbstractTestParticle.TestParticleInternal1
private typealias PersonWithQuery = AbstractTestParticle.TestParticleInternal2

fun Person.withQuery(): PersonWithQuery {
    // TODO(cypher1): Remove this when implicit casting to super types is supported by code gen.
    return PersonWithQuery(name = this.name, age = this.age, is_cool = this.is_cool)
}

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class AndroidEntityHandleManagerTest : LifecycleOwner {
    private lateinit var app: Application
    private lateinit var lifecycle: LifecycleRegistry
    override fun getLifecycle() = lifecycle

    val entity1 = Person("Jason", 21.0, false)
    val entity2 = Person("Jason", 22.0, true)
    lateinit var handleHolder: AbstractTestParticle.Handles
    private lateinit var handleManager: EntityHandleManager

    private val queryByMinAge = { value: RawEntity, args: Any ->
        value.singletons["age"].toPrimitiveValue<Double>(Double::class, 0.0) > (args as Double)
    }

    private val schema = Schema(
        setOf(SchemaName("Person")),
        SchemaFields(
            singletons = mapOf(
                "name" to FieldType.Text,
                "age" to FieldType.Number,
                "is_cool" to FieldType.Boolean
            ),
            collections = emptyMap()
        ),
        "1234acf",
        query = queryByMinAge
    )

    private val singletonKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("single-back"), storageKey = RamDiskStorageKey("single-ent")
    )

    private val collectionKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("collection-back"), storageKey = RamDiskStorageKey("collection-ent")
    )

    @Before
    fun setUp() = runBlockingTest {
        RamDisk.clear()
        DriverAndKeyConfigurator.configure(null)
        app = ApplicationProvider.getApplicationContext()
        lifecycle = LifecycleRegistry(this@AndroidEntityHandleManagerTest).apply {
            setCurrentState(Lifecycle.State.CREATED)
            setCurrentState(Lifecycle.State.STARTED)
            setCurrentState(Lifecycle.State.RESUMED)
        }

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)

        handleHolder = AbstractTestParticle.Handles()

        handleManager = EntityHandleManager(
            "testArc",
            "testHost",
            FakeTime(),
            Scheduler(
                FakeTime(),
                coroutineContext
            ),
            StoreManager(),
            ServiceStoreFactory(
                context = app,
                lifecycle = lifecycle,
                connectionFactory = TestConnectionFactory(app)
            )
        )
    }

    private fun expectHandleException(handleName: String, block: () -> Unit) {
        val e = assertThrows(NoSuchElementException::class, block)
        assertThat(e).hasMessageThat().isEqualTo(
            "Handle $handleName has not been initialized in TestParticle yet."
        )
    }

    @Test
    fun handle_uninitializedThrowsException() = runBlocking {
        expectHandleException("writeHandle") {
            handleHolder.writeHandle
        }

        expectHandleException("readHandle") {
            handleHolder.readHandle
        }

        expectHandleException("readWriteHandle") {
            handleHolder.readWriteHandle
        }

        expectHandleException("readCollectionHandle") {
            handleHolder.readCollectionHandle
        }

        expectHandleException("writeCollectionHandle") {
            handleHolder.writeCollectionHandle
        }

        expectHandleException("queryCollectionHandle") {
            handleHolder.queryCollectionHandle
        }

        expectHandleException("readWriteCollectionHandle") {
            handleHolder.readWriteCollectionHandle
        }

        expectHandleException("readQueryCollectionHandle") {
            handleHolder.readQueryCollectionHandle
        }

        expectHandleException("writeQueryCollectionHandle") {
            handleHolder.writeQueryCollectionHandle
        }

        expectHandleException("readWriteQueryCollectionHandle") {
            handleHolder.readWriteQueryCollectionHandle
        }
    }

    @Test
    fun singletonHandle_writeInOnSyncNoDesync() = runBlocking {
        val writeHandle = createSingletonHandle(
            handleManager,
            "writeHandle",
            HandleMode.Write
        )


        // Wait for sync
        val deferred = CompletableDeferred<Unit>()
        writeHandle.onReady {
            deferred.complete(Unit)
        }
        deferred.await()

        handleHolder.writeHandle.store(entity1)
        handleHolder.writeHandle.store(entity2)
    }

    @Test
    fun singletonHandle_writeFollowedByReadWithOnUpdate() = runBlocking {
        val writeHandle = createSingletonHandle(
            handleManager,
            "writeHandle",
            HandleMode.Write
        )

        assertThat(writeHandle).isInstanceOf(WriteSingletonHandle::class.java)
        handleHolder.writeHandle.store(entity1)

        val readHandle = createSingletonHandle(
            handleManager,
            "readHandle",
            HandleMode.Read
        )

        assertThat(readHandle).isInstanceOf(ReadSingletonHandle::class.java)

        val readBack = handleHolder.readHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)

        val readWriteHandle = createSingletonHandle(
            handleManager,
            "readWriteHandle",
            HandleMode.ReadWrite
        )
        assertThat(readWriteHandle).isInstanceOf(ReadWriteSingletonHandle::class.java)

        val readBack2 = handleHolder.readWriteHandle.fetch()
        assertThat(readBack2).isEqualTo(entity1)

        val updatedEntity: Person? = suspendCoroutine { continuation ->
            // Verify callbacks work
            launch {
                handleHolder.readWriteHandle.onUpdate {
                    continuation.resume(it)
                }
                handleHolder.writeHandle.store(entity2)
            }
        }

        assertThat(updatedEntity).isEqualTo(entity2)
    }

    @Test
    fun collectionHandle_writeFollowedByReadWithOnUpdate() = runBlocking<Unit> {
        val writeCollectionHandle = createCollectionHandle(
            handleManager,
            "writeCollectionHandle",
            HandleMode.Write
        )

        assertThat(writeCollectionHandle).isInstanceOf(WriteCollectionHandle::class.java)

        handleHolder.writeCollectionHandle.store(entity1)
        handleHolder.writeCollectionHandle.store(entity2)

        val readCollectionHandle = createCollectionHandle(
            handleManager,
            "readCollectionHandle",
            HandleMode.Read
        )

        assertThat(readCollectionHandle).isInstanceOf(ReadCollectionHandle::class.java)

        val readBack = handleHolder.readCollectionHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1, entity2)

        val readWriteCollectionHandle = createCollectionHandle(
            handleManager,
            "readWriteCollectionHandle",
            HandleMode.ReadWrite
        )

        assertThat(readWriteCollectionHandle).isInstanceOf(ReadWriteCollectionHandle::class.java)

        val readBack2 = handleHolder.readWriteCollectionHandle.fetchAll()
        assertThat(readBack2).containsExactly(entity1, entity2)

        val entity3 = entity2.copy(name = "Ray")

        val updatedEntities: Set<Person> = suspendCoroutine { continuation ->
            // Verify callbacks work
            launch {
                handleHolder.readWriteCollectionHandle.onUpdate {
                    continuation.resume(it)
                }
                handleHolder.writeCollectionHandle.store(entity3)
            }
        }
        assertThat(updatedEntities).containsExactly(entity1, entity2, entity3)
    }

    @Test
    fun handle_nameIsGloballyUnique() = runBlocking<Unit> {

        val shandle1 = createSingletonHandle(
            handleManager,
            "writeHandle",
            HandleMode.Write
        )

        val chandle1 = createCollectionHandle(
            handleManager,
            "writeCollectionHandle",
            HandleMode.Write
        )

        handleHolder.reset()

        val shandle2 = createSingletonHandle(
            handleManager,
            "writeHandle",
            HandleMode.Write
        )

        val chandle2 = createCollectionHandle(
            handleManager,
            "writeCollectionHandle",
            HandleMode.Write
        )

        assertThat(shandle1.name).isNotEqualTo(shandle2.name)
        assertThat(chandle1.name).isNotEqualTo(chandle2.name)
    }

    private suspend fun createSingletonHandle(
        handleManager: EntityHandleManager,
        handleName: String,
        handleMode: HandleMode
    ) = handleManager.createHandle(
        HandleSpec(
            handleName,
            handleMode,
            HandleContainerType.Singleton,
            handleHolder.getEntitySpec(handleName)
        ),
        singletonKey
    ).also { handleHolder.setHandle(handleName, it) }

    private suspend fun createCollectionHandle(
        handleManager: EntityHandleManager,
        handleName: String,
        handleMode: HandleMode
    ) = handleManager.createHandle(
        HandleSpec(
            handleName,
            handleMode,
            HandleContainerType.Collection,
            handleHolder.getEntitySpec(handleName)
        ),
        collectionKey
    ).also { handleHolder.setHandle(handleName, it) }
}
