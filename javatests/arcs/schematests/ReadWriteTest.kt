package arcs.schematests

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReadWriteTest {

    private lateinit var arcs: Arcs

    @Before
    fun setup() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(app))

        WorkManagerTestInitHelper.initializeTestWorkManager(app)
        arcs = Arcs(
            app,
            TestConnectionFactory(app)
        )
    }

    @After
    fun teardown() {
        runBlocking { arcs.stop() }
    }

    private val l0 = Level0("l0-1")
    private val l1 = Level1("l1-1", setOf(l0))
    private val l2 = Level2("l2-1", setOf(l1))

    @Test
    fun writeAndReadBack0() {
        arcs.put0(l0)
        assertThat(arcs.all0()).containsExactly(l0)
    }

    @Test
    fun writeAndReadBack1() {
        arcs.put1(l1)
        Thread.sleep(1000)
        assertThat(arcs.all1()).containsExactly(l1)
    }

    @Test
    fun writeAndReadBack2() {
        arcs.put2(l2)
        assertThat(arcs.all2()).containsExactly(l2)
    }
}
