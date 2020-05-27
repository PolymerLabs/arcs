package arcs.android.entity

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
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
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {

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
                fakeLifecycleOwner.lifecycle,
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
                fakeLifecycleOwner.lifecycle,
                connectionFactory = testConnectionFactory
            )
        )
        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
        (fakeLifecycleOwner.lifecycle as LifecycleRegistry).currentState = Lifecycle.State.STARTED
    }

    @After
    override fun tearDown() {
        super.tearDown()
        (fakeLifecycleOwner.lifecycle as LifecycleRegistry).currentState = Lifecycle.State.DESTROYED
    }

    @Ignore("b/154947352 - Deflake")
    @Test
    override fun collection_dereferenceEntity_nestedReference() {
        super.collection_dereferenceEntity_nestedReference()
    }

    @Ignore("b/154947352 - Deflake")
    @Test
    override fun collection_clearingElementsFromA_clearsThemFromB() {
        super.collection_clearingElementsFromA_clearsThemFromB()
    }

    @Ignore("b/156531598 - Deflake")
    @Test
    override fun singleton_clearOnAClearDataWrittenByA(){
        super.singleton_clearOnAClearDataWrittenByA()
    }

    @Ignore("b/157169542 - Deflake")
    @Test
    override fun collection_referenceLiveness() {
        super.collection_referenceLiveness()
    }

    @Ignore("b/157194439 - Deflake")
    @Test
    override fun singleton_writeAndOnUpdate() {
        super.singleton_writeAndOnUpdate()
    }

    @Ignore("b/157392315 - Deflake")
    @Test
    override fun collection_writeAndReadBack() {
        super.collection_writeAndReadBack()
    }

    @Ignore("b/157265849 - Deflake")
    @Test
    override fun singleton_referenceLiveness() {
        super.singleton_referenceLiveness()
    }

    @Ignore("b/157266157 - Deflake")
    @Test
    override fun collection_entityDereference() {
        super.collection_entityDereference()
    }

    @Ignore("b/157265691 - Deflake")
    @Test
    override fun singleton_clearOnAClearDataWrittenByB() {
        super.singleton_clearOnAClearDataWrittenByB()
    }

    @Ignore("b/157266178 - Deflake")
    @Test
    override fun singleton_dereferenceEntity() {
        super.singleton_dereferenceEntity()
    }


    @Ignore("b/157266221 - Deflake")
    @Test
    override fun singleton_dereferenceEntity_nestedReference() {
        super.singleton_dereferenceEntity_nestedReference()
    }

    @Ignore("b/157266123 - Deflake")
    @Test
    override fun collection_removingFromA_isRemovedFromB() {
        super.collection_removingFromA_isRemovedFromB()
    }

    @Ignore("b/157266376 - Deflake")
    @Test
    override fun collection_withTTL() {
        super.collection_withTTL()
    }

    @Ignore("b/157297299 - Deflake")
    @Test
    override fun collection_noTTL() {
        super.collection_noTTL()
    }
}
