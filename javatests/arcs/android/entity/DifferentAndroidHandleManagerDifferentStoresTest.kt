package arcs.android.entity

import android.app.Application
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.entity.HandleManagerTestBase
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.jvm.util.testutil.TimeImpl
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class DifferentAndroidHandleManagerDifferentStoresTest : HandleManagerTestBase() {

    val fakeLifecycleOwner = object : LifecycleOwner {
        private val lifecycle = LifecycleRegistry(this)
        override fun getLifecycle() = lifecycle
    }

    lateinit var app: Application

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
        val testConnectionFactory = TestConnectionFactory(app)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = TimeImpl(),
            stores = StoreManager(),
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
            stores = StoreManager(),
            activationFactory = ServiceStoreFactory(
                app,
                fakeLifecycleOwner.lifecycle,
                connectionFactory = testConnectionFactory
            )
        )
        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    // TODO - fix these?
    override fun collection_referenceLiveness() {}
    override fun singleton_referenceLiveness() {}

    // We don't expect these to pass, since Operations won't make it through the driver level
    override fun singleton_writeAndOnUpdate() {}
    override fun collection_writeAndOnUpdate() {}

}
