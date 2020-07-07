package arcs.android.entity

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.entity.HandleManagerTestBase
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.jvm.host.JvmSchedulerProvider
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlin.coroutines.EmptyCoroutineContext
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {
    lateinit var fakeLifecycleOwner: FakeLifecycleOwner
    lateinit var app: Application

    @Before
    override fun setUp() {
        super.setUp()
        testTimeout = 30000
        fakeLifecycleOwner = FakeLifecycleOwner()
        fakeLifecycleOwner.lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        fakeLifecycleOwner.lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        app = ApplicationProvider.getApplicationContext()
        val dbFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        DatabaseDriverProvider.configure(dbFactory) { throw UnsupportedOperationException() }
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        activationFactory = ServiceStoreFactory(
            app,
            fakeLifecycleOwner.lifecycle,
            connectionFactory = TestConnectionFactory(app)
        )
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("test"),
            stores = StoreManager(activationFactory)
        )
        writeHandleManager = readHandleManager

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    @After
    override fun tearDown() {
        super.tearDown()
        fakeLifecycleOwner.lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    }

    class FakeLifecycleOwner : LifecycleOwner {
        val lifecycleRegistry = LifecycleRegistry(this)
        override fun getLifecycle() = lifecycleRegistry
    }
}
