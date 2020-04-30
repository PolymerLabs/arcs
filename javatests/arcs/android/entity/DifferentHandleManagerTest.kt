package arcs.android.entity

import android.app.Application
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.entity.HandleManagerTestBase
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.jvm.host.JvmSchedulerProvider
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {
    lateinit var app: Application

    override var testRunner = { block: suspend CoroutineScope.() -> Unit ->
        runBlocking { this.block() }
    }

    @Before
    override fun setUp() {
        super.setUp()
        app = ApplicationProvider.getApplicationContext()
        val stores = StoreManager()
        val testConnectionFactory = TestConnectionFactory(app)
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader"),
            stores = stores,
            activationFactory = ServiceStoreFactory(
                app,
                ProcessLifecycleOwner.get().lifecycle,
                connectionFactory = testConnectionFactory
            )
        )
        writeHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
            stores = stores,
            activationFactory = ServiceStoreFactory(
                app,
                ProcessLifecycleOwner.get().lifecycle,
                connectionFactory = testConnectionFactory
            )
        )
        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    @After
    override fun tearDown() = super.tearDown()

    // TODO(b/152436411): Fix these.
    override fun collection_referenceLiveness() {}
    override fun singleton_referenceLiveness() {}
}
