package arcs.core.allocator

import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/**
 * Tests run on JVM.
 */
@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class CoreAllocatorTest : AllocatorTestBase() {
    @Test
    @Ignore("b/156404800 - Deflake")
    override fun allocator_restartArcInTwoExternalHosts() {
        super.allocator_restartArcInTwoExternalHosts()
    }
}
