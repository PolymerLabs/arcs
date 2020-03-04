package arcs.android.host

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.EntityHandleManager
import arcs.core.host.HandleMode
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertThrows
import arcs.sdk.ReadWriteCollection
import arcs.sdk.ReadWriteSingleton
import arcs.sdk.ReadableCollection
import arcs.sdk.ReadableSingleton
import arcs.sdk.WritableCollection
import arcs.sdk.WritableSingleton
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.testutil.TestBindingDelegate
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.coroutines.experimental.suspendCoroutine

typealias Person = TestParticleInternal1

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class AndroidEntityHandleManagerTest : LifecycleOwner {
    private lateinit var app: Application
    private lateinit var lifecycle: LifecycleRegistry
    override fun getLifecycle() = lifecycle

    val entity1 = Person("Jason", 21.0, false)
    val entity2 = Person("Jason", 22.0, true)
    lateinit var handleHolder: TestParticleHandles
    private lateinit var handleManager: EntityHandleManager

    private val schema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(
            singletons = mapOf(
                "name" to FieldType.Text,
                "age" to FieldType.Number,
                "is_cool" to FieldType.Boolean
            ),
            collections = emptyMap()
        ),
        "1234acf"
    )

    private val singletonKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("single-back"), storageKey = RamDiskStorageKey("single-ent")
    )

    private val setKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("set-back"), storageKey = RamDiskStorageKey("set-ent")
    )

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
        lifecycle = LifecycleRegistry(this).apply {
            setCurrentState(Lifecycle.State.CREATED)
            setCurrentState(Lifecycle.State.STARTED)
            setCurrentState(Lifecycle.State.RESUMED)
        }

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)

        handleHolder = TestParticleHandles()

        handleManager = EntityHandleManager(
            AndroidHandleManager(
                lifecycle = lifecycle,
                context = app,
                connectionFactory = DefaultConnectionFactory(app, TestBindingDelegate(app))
            )
        )
    }

    private fun expectHandleException(handleName: String, block: () -> Unit) {
        val e = assertThrows(NoSuchElementException::class, block)
        assertThat(e).hasMessageThat().isEqualTo(
            "Handle ${handleName} not initialized in TestParticle"
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

        expectHandleException("writeSetHandle") {
            handleHolder.writeSetHandle
        }

        expectHandleException("readSetHandle") {
            handleHolder.readSetHandle
        }

        expectHandleException("readWriteSetHandle") {
            handleHolder.readWriteSetHandle
        }
    }

    private suspend fun createSingletonHandle(
        handleManager: EntityHandleManager,
        handleName: String,
        handleMode: HandleMode
    ) = handleManager.createSingletonHandle(
        handleHolder,
        handleName,
        singletonKey,
        schema,
        handleMode
    )

    private suspend fun createSetHandle(
        handleManager: EntityHandleManager,
        handleName: String,
        handleMode: HandleMode
    ) = handleManager.createSetHandle(
        handleHolder,
        handleName,
        setKey,
        schema,
        handleMode
    )

    @Test
    fun singletonHandle_writeFollowedByReadWithOnUpdate() = runBlocking {
        val writeHandle = createSingletonHandle(
            handleManager,
            "writeHandle",
            HandleMode.Write
        )

        assertThat(writeHandle).isInstanceOf(WritableSingleton::class.java)
        assertThat(writeHandle).isNotInstanceOf(ReadableSingleton::class.java)
        handleHolder.writeHandle.store(entity1)

        val readHandle = createSingletonHandle(
            handleManager,
            "readHandle",
            HandleMode.Read
        )

        assertThat(readHandle).isInstanceOf(ReadableSingleton::class.java)
        assertThat(readHandle).isNotInstanceOf(WritableSingleton::class.java)

        val readBack = handleHolder.readHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)

        val readWriteHandle = createSingletonHandle(
            handleManager,
            "readWriteHandle",
            HandleMode.ReadWrite
        )
        assertThat(readWriteHandle).isInstanceOf(ReadWriteSingleton::class.java)

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
    fun setHandle_writeFollowedByReadWithOnUpdate() = runBlocking<Unit> {
        val writeSetHandle = createSetHandle(
            handleManager,
            "writeSetHandle",
            HandleMode.Write
        )

        assertThat(writeSetHandle).isInstanceOf(WritableCollection::class.java)
        assertThat(writeSetHandle).isNotInstanceOf(ReadableCollection::class.java)

        handleHolder.writeSetHandle.store(entity1)
        handleHolder.writeSetHandle.store(entity2)

        val readSetHandle = createSetHandle(
            handleManager,
            "readSetHandle",
            HandleMode.Read
        )

        assertThat(readSetHandle).isInstanceOf(ReadableCollection::class.java)
        assertThat(readSetHandle).isNotInstanceOf(WritableCollection::class.java)

        val readBack = handleHolder.readSetHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1, entity2)

        val readWriteSetHandle = createSetHandle(
            handleManager,
            "readWriteSetHandle",
            HandleMode.ReadWrite
        )

        assertThat(readWriteSetHandle).isInstanceOf(ReadWriteCollection::class.java)

        val readBack2 = handleHolder.readWriteSetHandle.fetchAll()
        assertThat(readBack2).containsExactly(entity1, entity2)

        val entity3 = entity2.copy(name = "Ray")

        val updatedEntities: Set<Person> = suspendCoroutine { continuation ->
            // Verify callbacks work
            launch {
                handleHolder.readWriteSetHandle.onUpdate {
                    continuation.resume(it)
                }
                handleHolder.writeSetHandle.store(entity3)
            }
        }
        assertThat(updatedEntities).containsExactly(entity1, entity2, entity3)
    }
}
