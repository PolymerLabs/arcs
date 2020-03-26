package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.jvm.util.testutil.TimeImpl
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {

    @Before
    fun setUp() {
        val stores = StoreManager()
        readHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = TimeImpl(),
            stores = stores
        )
        writeHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = TimeImpl(),
            stores = stores
        )
    }
}
