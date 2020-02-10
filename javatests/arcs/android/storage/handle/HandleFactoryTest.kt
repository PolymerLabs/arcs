package arcs.android.storage.handle

import android.app.Application
import android.content.ServiceConnection
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.ParcelableStoreOptions
import arcs.android.storage.service.IStorageService
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
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


@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class HandleFactoryTest {
    private lateinit var app: Application

    inner class TestBindingDelegate : StorageServiceBindingDelegate {
        var sc: ServiceController<StorageService>? = null
        override fun bindStorageService(conn: ServiceConnection, flags: Int, options: ParcelableStoreOptions): Boolean {
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

    val entity1 = RawEntity("empty", singletons=mapOf(
        "name" to "Jason".toReferencable(),
        "age" to 21.toReferencable(),
        "is_cool" to false.toReferencable()
    ), collections=emptyMap())

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

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
        app.setTheme(R.style.Theme_AppCompat);

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    fun handleFactoryTest(block: suspend (HandleFactory) -> Unit) {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.moveToState(Lifecycle.State.STARTED)

        scenario.onActivity { activity ->
            runBlocking {
                val hf = HandleFactory(
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
        handleFactoryTest { hf ->
            val singletonHandle = hf.singletonHandle(HandleFactory.ramdiskStorageKeyForName("foo"), schema)
            singletonHandle.set(entity1)

            // Now read back from a different handle
            val readbackHandle = hf.singletonHandle(HandleFactory.ramdiskStorageKeyForName("foo"), schema)
            val readBack = readbackHandle.fetch()
            assertThat(readBack).isEqualTo(entity1)
        }
    }

    @Test
    fun testCreateSetHandle() = runBlockingTest {
        handleFactoryTest { hf ->
            val setHandle = hf.setHandle(HandleFactory.ramdiskStorageKeyForName("fooset"), schema)
            setHandle.store(entity1)
        }
    }
}
