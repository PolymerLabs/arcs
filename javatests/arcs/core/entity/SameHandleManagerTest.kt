package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.Stores
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.TimeImpl
import org.junit.Before
import org.junit.Rule
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {

    @get:Rule var logRule = LogRule()

    @Before
    fun setUp() {
        readHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = TimeImpl(),
            stores = Stores()
        )
        writeHandleManager = readHandleManager
    }
}
