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
        activationFactory = ServiceStoreFactory(
            app,
            fakeLifecycleOwner.lifecycle,
            connectionFactory = TestConnectionFactory(app)
        )
        val stores = StoreManager(activationFactory)
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader"),
            stores = stores
        )
        writeHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
            stores = stores
        )
        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    @After
    override fun tearDown() {
        super.tearDown()
        fakeLifecycleOwner.lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    }

    @Test
    override fun collection_dereferenceEntity_nestedReference() {
        super.collection_dereferenceEntity_nestedReference()
    }

    @Test
    override fun collection_clearingElementsFromA_clearsThemFromB() {
        super.collection_clearingElementsFromA_clearsThemFromB()
    }

    @Test
    override fun singleton_clearOnAClearDataWrittenByA(){
        super.singleton_clearOnAClearDataWrittenByA()
    }

    @Test
    override fun collection_referenceLiveness() {
        super.collection_referenceLiveness()
    }

    @Test
    override fun singleton_writeAndOnUpdate() {
        super.singleton_writeAndOnUpdate()
    }

    @Test
    override fun collection_writeAndReadBack() {
        super.collection_writeAndReadBack()
    }

    @Test
    override fun singleton_referenceLiveness() {
        super.singleton_referenceLiveness()
    }

    @Test
    override fun collection_entityDereference() {
        super.collection_entityDereference()
    }

    @Test
    override fun singleton_clearOnAClearDataWrittenByB() {
        super.singleton_clearOnAClearDataWrittenByB()
    }

    @Test
    override fun singleton_dereferenceEntity() {
        super.singleton_dereferenceEntity()
    }


    @Test
    override fun singleton_dereferenceEntity_nestedReference() {
        super.singleton_dereferenceEntity_nestedReference()
    }

    @Test
    override fun collection_removingFromA_isRemovedFromB() {
        super.collection_removingFromA_isRemovedFromB()
    }

    @Test
    override fun collection_withTTL() {
        super.collection_withTTL()
    }

    @Test
    override fun collection_noTTL() {
        super.collection_noTTL()
    }

    class FakeLifecycleOwner : LifecycleOwner {
        val lifecycleRegistry = LifecycleRegistry(this)
        override fun getLifecycle() = lifecycleRegistry
    }
}
