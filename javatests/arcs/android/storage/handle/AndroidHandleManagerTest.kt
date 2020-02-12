package arcs.android.storage.handle

import android.app.Application
import android.content.ServiceConnection
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.ParcelableStoreOptions
import arcs.android.storage.handle.TestActivity
import arcs.android.storage.service.IStorageService
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.handle.ExperimentalHandleApi
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceBindingDelegate
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.android.controller.ServiceController


@ExperimentalHandleApi
@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class AndroidHandleManagerTest {
    private lateinit var app: Application

    inner class TestBindingDelegate : StorageServiceBindingDelegate {
        var sc: ServiceController<StorageService>? = null
        override fun bindStorageService(
            conn: ServiceConnection,
            flags: Int,
            options: ParcelableStoreOptions
        ): Boolean {
            val intent = StorageService.createBindIntent(
                app,
                options
            )
            sc = Robolectric.buildService(StorageService::class.java, intent)
                .create()
                .bind()
                .also {
                    val binder = it.get().onBind(intent)
                    conn.onServiceConnected(null, binder)
                }
            return true
        }

        override fun unbindStorageService(conn: ServiceConnection) {
            sc?.destroy()
        }
    }

    val entity1 = RawEntity(
        "entity1",
        singletons=mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 21.toReferencable(),
            "is_cool" to false.toReferencable()
        ),
        collections=emptyMap()
    )

    val entity2 = RawEntity(
        "entity2",
        singletons=mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 22.toReferencable(),
            "is_cool" to true.toReferencable()
        ),
        collections=emptyMap()
    )

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
        SchemaDescription(),
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
                    connectionFactory = DefaultConnectionFactory(activity, TestBindingDelegate())
                )
                block(hf)
            }
        }

        scenario.close()
    }

    @Test
    fun testCreateSingletonHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val singletonHandle = hm.singletonHandle(singletonKey, schema)
            singletonHandle.set(entity1)

            // Now read back from a different handle
            val readbackHandle = hm.singletonHandle(singletonKey, schema)
            val readBack = readbackHandle.fetch()
            assertThat(readBack).isEqualTo(entity1)
        }
    }

    @Test
    fun testCreateSetHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val setHandle = hm.setHandle(setKey, schema)
            setHandle.store(entity1)
            setHandle.store(entity2)

            // Now read back from a different handle
            val readbackHandle = hm.setHandle(setKey, schema)
            val readBack = readbackHandle.value()
            assertThat(readBack).containsExactly(entity1, entity2)
        }
    }
}
