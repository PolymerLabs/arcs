package arcs.core.storage.handle

import arcs.jvm.util.testutil.TimeImpl
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {

    @Before
    fun setUp() {
        readHandleManager = HandleManager(TimeImpl(), Stores())
        writeHandleManager = readHandleManager
    }
}
