package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.jvm.util.testutil.TimeImpl
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {

    @Before
    override fun setUp() {
        super.setUp()
        readHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = TimeImpl()
        )
        writeHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = TimeImpl()
        )
    }

    @After
    override fun tearDown() = super.tearDown()
}
