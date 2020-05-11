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
import arcs.jvm.host.JvmSchedulerProvider
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.coroutines.EmptyCoroutineContext

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class DifferentAndroidHandleManagerDifferentStoresTest : HandleManagerTestBase() {

    val fakeLifecycleOwner = object : LifecycleOwner {
        private val lifecycle = LifecycleRegistry(this)
        override fun getLifecycle() = lifecycle
    }

    lateinit var app: Application

    override var testRunner = { block: suspend CoroutineScope.() -> Unit ->
        runBlocking { this.block() }
    }

    @Before
    override fun setUp() {
        super.setUp()
        app = ApplicationProvider.getApplicationContext()
        val testConnectionFactory = TestConnectionFactory(app)
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader"),
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
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
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

    @After
    override fun tearDown() = super.tearDown()

    @Ignore("b/154947352 - Deflake")
    @Test
    override fun collection_removingFromA_isRemovedFromB() {
        super.collection_removingFromA_isRemovedFromB()
    }

    @Ignore("b/154947352 - Deflake")
    @Test
    override fun collection_addingToA_showsUpInQueryOnB() {
        super.collection_addingToA_showsUpInQueryOnB()
    }

    @Ignore("b/154947352 - Deflake")
    @Test
    override fun collection_clearingElementsFromA_clearsThemFromB() {
        super.collection_clearingElementsFromA_clearsThemFromB()
    }
}
