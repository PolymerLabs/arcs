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
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.coroutines.EmptyCoroutineContext

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class DifferentAndroidHandleManagerDifferentStoresTest : HandleManagerTestBase() {

    lateinit var fakeLifecycleOwner: FakeLifecycleOwner
    lateinit var app: Application

    @Before
    override fun setUp() {
        super.setUp()
        testTimeout = 60000
        fakeLifecycleOwner = FakeLifecycleOwner()
        fakeLifecycleOwner.lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        fakeLifecycleOwner.lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        val dbFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        DatabaseDriverProvider.configure(dbFactory) { throw UnsupportedOperationException() }
        app = ApplicationProvider.getApplicationContext()
        activationFactory = ServiceStoreFactory(
            app,
            fakeLifecycleOwner.lifecycle,
            connectionFactory = TestConnectionFactory(app)
        )
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader"),
            stores = StoreManager(activationFactory)
        )
        writeHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
            stores = StoreManager(activationFactory)
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
    override fun collection_referenceLiveness() {
        super.collection_referenceLiveness()
    }

    @Test
    override fun collection_removingFromA_isRemovedFromB() {
        super.collection_removingFromA_isRemovedFromB()
    }

    @Test
    override fun collection_addingToA_showsUpInQueryOnB() {
        super.collection_addingToA_showsUpInQueryOnB()
    }

    @Test
    override fun collection_clearingElementsFromA_clearsThemFromB() {
        super.collection_clearingElementsFromA_clearsThemFromB()
    }

    @Test
    override fun singleton_dereferenceEntity_nestedReference() {
        super.singleton_dereferenceEntity_nestedReference()
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
    override fun collection_dereferenceEntity_nestedReference() {
        super.collection_dereferenceEntity_nestedReference()
    }

    @Test
    override fun collection_withTTL() {
        super.collection_withTTL()
    }

    @Test
    override fun singleton_referenceLiveness() {
        super.singleton_referenceLiveness()
    }

    @Test
    override fun singleton_dereferenceEntity() {
        super.singleton_dereferenceEntity()
    }

    class FakeLifecycleOwner : LifecycleOwner {
        val lifecycleRegistry = LifecycleRegistry(this)
        override fun getLifecycle() = lifecycleRegistry
    }
}
