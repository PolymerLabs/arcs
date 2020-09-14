package arcs.android.entity

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.entity.HandleManagerTestBase
import arcs.core.host.EntityHandleManager
import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StoreManager
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {

    lateinit var app: Application

    lateinit var stores: StoreManager

    @Before
    override fun setUp() {
        super.setUp()
        testTimeout = 60000
        val dbFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        DatabaseDriverProvider.configure(dbFactory) { throw UnsupportedOperationException() }
        app = ApplicationProvider.getApplicationContext()
        activationFactory = ServiceStoreFactory(
            app,
            connectionFactory = TestConnectionFactory(app)
        )
        stores = StoreManager(activationFactory)
        val storageEndpointManager = DirectStorageEndpointManager(stores)
        monitorStorageEndpointManager = storageEndpointManager
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader"),
            storageEndpointManager = storageEndpointManager,
            foreignReferenceChecker = foreignReferenceChecker
        )
        writeHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
            storageEndpointManager = storageEndpointManager,
            foreignReferenceChecker = foreignReferenceChecker
        )
        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    @After
    override fun tearDown() {
        super.tearDown()
        runBlocking {
            stores.reset()
        }
    }
}
