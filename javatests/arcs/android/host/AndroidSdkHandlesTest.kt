package arcs.android.host

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.handle.AndroidHandleManager
import arcs.android.storage.handle.TestActivity
import arcs.android.storage.service.IStorageService
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.host.createSdkHandle
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.BaseParticle
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.testutil.TestBindingDelegate
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric


typealias Person = TestParticleInternal1

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class AndroidSdkHandlesTest {
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

    fun handleManagerTest(block: suspend (HandleManager) -> Unit) {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.moveToState(Lifecycle.State.STARTED)

        scenario.onActivity { activity ->
            runBlocking {
                val hf = AndroidHandleManager(
                    lifecycle = activity.lifecycle,
                    context = activity,
                    connectionFactory = DefaultConnectionFactory(activity, TestBindingDelegate(app))
                )
                block(hf)
            }
        }

        scenario.close()
    }

    @Test
    fun testCreateSingletonHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val singletonHandle = hm.singletonHandle(singletonKey, schema, canRead = false)

            val handleHolder = TestParticleHandles()
            createSdkHandle(handleHolder, "writeHandle", singletonHandle)
            handleHolder.writeHandle.set(entity1)
            // Now read back from a different handle
            val readbackHandle = hm.singletonHandle(singletonKey, schema)
            createSdkHandle(handleHolder, "readWriteHandle", readbackHandle)
            val readBack = handleHolder.readWriteHandle.fetch()
            assertThat(readBack).isEqualTo(entity1)
        }
    }

    @Test
    fun testCreateSetHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val setHandle = hm.setHandle(setKey, schema)
            val handleHolder = TestParticleHandles()
            createSdkHandle(handleHolder, "writeSetHandle", setHandle)

            handleHolder.writeSetHandle.store(entity1)
            handleHolder.writeSetHandle.store(entity2)

            // Now read back from a different handle
            val readbackHandle = hm.setHandle(setKey, schema)
            createSdkHandle(handleHolder, "readWriteSetHandle", readbackHandle)

            val readBack = handleHolder.readWriteSetHandle.fetchAll()
            assertThat(readBack).containsExactly(entity1, entity2)
        }
    }
}
