package arcs.android.host

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.handle.AndroidHandleManager
import arcs.android.storage.handle.TestActivity
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.HandleMode
import arcs.core.host.SdkHandleManager
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
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
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.coroutines.experimental.suspendCoroutine

typealias Person = TestParticleInternal1

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class AndroidSdkHandleManagerTest {
    private lateinit var app: Application

    val entity1 = Person("Jason", 21.0, false)
    val entity2 = Person("Jason", 22.0, true)

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
        backingKey = RamDiskStorageKey("single-back"),
        storageKey = RamDiskStorageKey("single-ent")
    )

    private val setKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("set-back"),
        storageKey = RamDiskStorageKey("set-ent")
    )

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
        app.setTheme(R.style.Theme_AppCompat);

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    fun handleManagerTest(block: suspend (SdkHandleManager) -> Unit) {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.moveToState(Lifecycle.State.STARTED)

        scenario.onActivity { activity ->
            runBlocking {
                val hf = AndroidHandleManager(
                    lifecycle = activity.lifecycle,
                    context = activity,
                    connectionFactory = DefaultConnectionFactory(activity, TestBindingDelegate(app))
                )
                block(SdkHandleManager(hf))
            }
        }

        scenario.close()
    }

    private fun expectHandleException(
        handleName: String,
        block: () -> Unit
    ) {
        try {
            block()
        } catch (e: Exception) {
            assertThat(e).isInstanceOf(NoSuchElementException::class.java)
            assertThat(e.message).isEqualTo(
                "Handle ${handleName} not initialized in TestParticle"
            )
        }
    }

    @Test
    fun testCreateSingletonHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val handleHolder = TestParticleHandles()
            val writeHandleName = "writeHandle"

            // Uninitialized handles throw exceptions
            expectHandleException(writeHandleName) {
                handleHolder.writeHandle
            }

            val writeHandle = hm.sdkSingletonHandle(
                handleHolder,
                writeHandleName,
                singletonKey,
                schema,
                HandleMode.Write
            )
            assertThat(writeHandle).isInstanceOf(WritableSingleton::class.java)
            assertThat(writeHandle).isNotInstanceOf(ReadableSingleton::class.java)
            handleHolder.writeHandle.store(entity1)

            // Now read back from a different handle
            val readHandleName = "readHandle"

            expectHandleException(readHandleName) {
                handleHolder.readHandle
            }

            val readHandle = hm.sdkSingletonHandle(
                handleHolder,
                readHandleName,
                singletonKey,
                schema,
                HandleMode.Read
            )
            val readBack = handleHolder.readHandle.fetch()
            assertThat(readHandle).isInstanceOf(ReadableSingleton::class.java)
            assertThat(readHandle).isNotInstanceOf(WritableSingleton::class.java)

            assertThat(readBack).isEqualTo(entity1)

            // Now read back from a different handle
            val readWriteHandleName = "readWriteHandle"

            expectHandleException(readWriteHandleName) {
                handleHolder.readWriteHandle
            }

            val readWriteHandle = hm.sdkSingletonHandle(
                handleHolder,
                readWriteHandleName,
                singletonKey,
                schema,
                HandleMode.ReadWrite
            )
            val readBack2 = handleHolder.readWriteHandle.fetch()
            assertThat(readWriteHandle).isInstanceOf(ReadWriteSingleton::class.java)
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
    }

    @Test
    fun testCreateSetHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val handleHolder = TestParticleHandles()
            val writeSetHandleName = "writeSetHandle"

            expectHandleException(writeSetHandleName) {
                handleHolder.writeSetHandle
            }

            val writeSetHandle = hm.sdkSetHandle(
                handleHolder,
                writeSetHandleName,
                setKey,
                schema,
                HandleMode.Write
            )
            assertThat(writeSetHandle).isInstanceOf(WritableCollection::class.java)
            assertThat(writeSetHandle).isNotInstanceOf(ReadableCollection::class.java)

            handleHolder.writeSetHandle.store(entity1)
            handleHolder.writeSetHandle.store(entity2)

            // Now read back from a different handle
            val readSetHandleName = "readSetHandle"

            expectHandleException(writeSetHandleName) {
                handleHolder.writeSetHandle
            }

            val readSetHandle = hm.sdkSetHandle(
                handleHolder,
                readSetHandleName,
                setKey,
                schema,
                HandleMode.Read
            )

            assertThat(readSetHandle).isInstanceOf(ReadableCollection::class.java)
            assertThat(readSetHandle).isNotInstanceOf(WritableCollection::class.java)

            val readBack = handleHolder.readSetHandle.fetchAll()
            assertThat(readBack).containsExactly(entity1, entity2)

            // Now read back from a different handle
            val readWriteSetHandleName = "readWriteSetHandle"

            expectHandleException(readWriteSetHandleName) {
                handleHolder.readWriteSetHandle
            }

            val readWriteSetHandle = hm.sdkSetHandle(
                handleHolder,
                readWriteSetHandleName,
                setKey,
                schema,
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
}
