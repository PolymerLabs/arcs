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
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {

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
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("test"),
            stores = StoreManager(),
            activationFactory = ServiceStoreFactory(
                app,
                fakeLifecycleOwner.lifecycle,
                connectionFactory = TestConnectionFactory(app)
            )
        )
        writeHandleManager = readHandleManager

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    @After
    override fun tearDown() = super.tearDown()

    @Ignore("b/154947352 - Deflake")
    @Test
    override fun singleton_clearOnAClearDataWrittenByB() {
        super.singleton_clearOnAClearDataWrittenByB()
    }

    @Ignore("b/154947352 - Deflake")
    @Test
    override fun collection_clearingElementsFromA_clearsThemFromB() {
        super.collection_clearingElementsFromA_clearsThemFromB()
    }

    @Ignore("b/156435662 - Deflake")
    @Test
    override fun collection_referenceLiveness() {
        super.collection_referenceLiveness()
    }

    @Ignore("b/156863049 - Deflake")
    @Test
    override fun singleton_referenceLiveness() {
        super.singleton_referenceLiveness()
    }

    @Ignore("b/156994024 - Deflake")
    @Test
    override fun singleton_withTTL() {
        super.singleton_withTTL()
    }

    @Ignore("b/157390220 - Deflake")
    @Test
    override fun singleton_writeAndReadBackAndClear() {
        super.singleton_writeAndReadBackAndClear()
    }
}
