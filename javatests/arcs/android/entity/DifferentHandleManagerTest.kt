package arcs.android.entity

import android.app.Application
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.entity.HandleManagerTestBase
import arcs.core.host.EntityHandleManager
import arcs.core.storage.handle.Stores
import arcs.jvm.util.testutil.TimeImpl
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {

    val fakeLifecycleOwner = object : LifecycleOwner {
        private val lifecycle = LifecycleRegistry(this)
        override fun getLifecycle() = lifecycle
    }

    lateinit var app: Application

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
        val stores = Stores()
        val testConnectionFactory = TestConnectionFactory(app)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = TimeImpl(),
            stores = stores,
            activationFactory = ServiceStoreFactory(
                app,
                fakeLifecycleOwner.lifecycle,
                connectionFactory = testConnectionFactory
            )
        )
        writeHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = TimeImpl(),
            stores = stores,
            activationFactory = ServiceStoreFactory(
                app,
                fakeLifecycleOwner.lifecycle,
                connectionFactory = testConnectionFactory
            )
        )
        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }
}
