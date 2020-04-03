package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.TimeImpl
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {

    @get:Rule var logRule = LogRule()

    @Before
    override fun setUp() {
        super.setUp()
        readHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = TimeImpl()
        )
        writeHandleManager = readHandleManager
    }

    @After
    override fun tearDown() = super.tearDown()
}
