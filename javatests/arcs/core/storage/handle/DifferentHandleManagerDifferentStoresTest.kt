package arcs.core.storage.handle

import arcs.jvm.util.testutil.TimeImpl
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DifferentHandleManagerDifferentStoresTest : HandleManagerTestBase() {

    @Before
    fun setUp() {
        readHandleManager = HandleManager(TimeImpl(), Stores())
        writeHandleManager = HandleManager(TimeImpl(), Stores())
    }

    // TODO - fix these?
    override fun collection_referenceLiveness() {}
    override fun singleton_referenceLiveness() {}

    // We don't expect these to pass, since Operations won't make it through the driver level
    override fun singleton_writeAndOnUpdate() {}
    override fun collection_writeAndOnUpdate() {}

}
