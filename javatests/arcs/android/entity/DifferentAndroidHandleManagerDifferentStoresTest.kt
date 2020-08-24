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
class DifferentAndroidHandleManagerDifferentStoresTest : HandleManagerTestBase() {
    lateinit var app: Application

    lateinit var readStores: StoreManager
    lateinit var writeStores: StoreManager

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
        readStores = StoreManager(activationFactory)
        monitorStorageEndpointManager = DirectStorageEndpointManager(readStores)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader"),
            storageEndpointManager = DirectStorageEndpointManager(readStores)
        )
        writeStores = StoreManager(activationFactory)
        writeHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
            storageEndpointManager = DirectStorageEndpointManager(writeStores)
        )
        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    @After
    override fun tearDown() {
        super.tearDown()
        runBlocking {
            readStores.reset()
            writeStores.reset()
        }
    }
}
