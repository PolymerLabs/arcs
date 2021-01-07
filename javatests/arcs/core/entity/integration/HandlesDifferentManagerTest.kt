package arcs.core.entity.integration

import arcs.core.host.HandleManagerImpl
import arcs.core.storage.testutil.testStorageEndpointManager
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class HandlesDifferentManagerTest : HandlesTestBase() {
  private var i = 0

  @Before
  override fun setUp() {
    super.setUp()
    val storageEndpointManager = testStorageEndpointManager()
    i++
    monitorStorageEndpointManager = storageEndpointManager
    readHandleManagerImpl = HandleManagerImpl(
      arcId = "testArc",
      hostId = "testHost",
      time = fakeTime,
      scheduler = schedulerProvider("reader-#$i"),
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = foreignReferenceChecker
    )
    writeHandleManagerImpl = HandleManagerImpl(
      arcId = "testArc",
      hostId = "testHost",
      time = fakeTime,
      scheduler = schedulerProvider("writer-#$i"),
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = foreignReferenceChecker
    )
  }

  @After
  override fun tearDown() = super.tearDown()
}
