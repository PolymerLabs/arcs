package arcs.showcase.references

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.storage.DriverFactory
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.database.DatabaseManager
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class ReadWriteTest {

    private lateinit var arcsStorage: ArcsStorage

    private lateinit var dbManager: AndroidSqliteDatabaseManager
    @Before
    fun setUp() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        dbManager = AndroidSqliteDatabaseManager(app)
        DriverAndKeyConfigurator.configure(dbManager)

        WorkManagerTestInitHelper.initializeTestWorkManager(app)
        val arcs = Arcs(
            app,
            TestConnectionFactory(app)
        )
        arcsStorage = ArcsStorage(arcs)
    }

    @After
    fun tearDown() {
        arcsStorage.stop()
        runBlocking {
            // Attempt a resetAll().
            // Rarely, this fails with "attempt to re-open an already-closed object"
            // Ignoring this exception should be OK.
            try {
                dbManager.resetAll()
            } catch(e: Exception) {
                println("Ignoring dbManager.resetAll() exception: $e")
            }

        }
    }

    private val l0 = MyLevel0("l0-1")
    private val l1 = MyLevel1("l1-1", setOf(l0))
    private val l2 = MyLevel2("l2-1", setOf(l1))

    @Test
    @Ignore("b/156993103 - Deflake")
    fun writeAndReadBack0() {
        arcsStorage.put0(l0)
        assertThat(arcsStorage.all0()).containsExactly(l0)
    }

    @Test
    @Ignore("b/157088298 - Deflake")
    fun writeAndReadBack1() {
        arcsStorage.put1(l1)
        assertThat(arcsStorage.all1()).containsExactly(l1)
    }

    @Test
    fun writeAndReadBack2() {
        arcsStorage.put2(l2)
        assertThat(arcsStorage.all2()).containsExactly(l2)
    }
}
