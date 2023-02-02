package arcs.core.entity.integration

import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST", "UnsafeCoroutineCrossing")
class HandlesTest(params: Params) : HandlesTestBase(params) {
  @Before
  override fun setUp() = runBlocking {
    super.setUp()
    initHandleManagers()
  }

  companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS: Array<Params> = arrayOf(
      HandlesTestBase.SAME_MANAGER,
      HandlesTestBase.DIFFERENT_MANAGER,
      HandlesTestBase.DIFFERENT_MANAGER_DIFFERENT_STORES
    )
  }
}
