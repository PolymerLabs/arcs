package arcs.core.storage.handle

import arcs.jvm.util.testutil.TimeImpl
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {

    @Before
    fun setUp() {
        val stores = Stores()
        readHandleManager = HandleManager(TimeImpl(), stores)
        writeHandleManager = HandleManager(TimeImpl(), stores)
    }
}
