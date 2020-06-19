package arcs.showcase.references

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class ReadWriteTest {

    private lateinit var arcs: Arcs

    @Before
    fun setUp() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(app))

        WorkManagerTestInitHelper.initializeTestWorkManager(app)
        arcs = Arcs(
            app,
            TestConnectionFactory(app)
        )
    }

    @After
    fun tearDown() {
        runBlocking { arcs.stop() }
    }

    private val l0 = MyLevel0("l0-1")
    private val l1 = MyLevel1("l1-1", setOf(l0))
    private val l2 = MyLevel2("l2-1", setOf(l1))

    @Ignore("b/156993103 - Deflake")
    @Test
    fun writeAndReadBack0() {
        arcs.put0(l0)
        assertThat(arcs.all0()).containsExactly(l0)
    }

    @Ignore("b/157088298 - Deflake")
    @Test
    fun writeAndReadBack1() {
        arcs.put1(l1)
        assertThat(arcs.all1()).containsExactly(l1)
    }

    @Test
    @Ignore("b/155502365")
    fun writeAndReadBack2() {
        arcs.put2(l2)
        assertThat(arcs.all2()).containsExactly(l2)
    }
}
