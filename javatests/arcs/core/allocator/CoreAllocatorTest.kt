package arcs.core.allocator

import arcs.core.host.TestingHost
import arcs.core.host.TestingProdHost
import arcs.jvm.host.scanForParticles
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/**
 * Tests run on JVM.
 */
@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class CoreAllocatorTest : AllocatorTestBase() {

    class CoreProdHost(
        handleManagerProvider: HandleManagerProvider
    ) : TestingHost(
        handleManagerProvider,
        *scanForParticles(TestingProdHost::class)
    ), TestingProdHost

    override fun pureHost() = CoreProdHost(handleManagerProvider)
}
