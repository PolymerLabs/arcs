package arcs.showcase.typevariables

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.host.toRegistration
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class VariableTest {

  @get:Rule
  val env = IntegrationEnvironment(
    ::OrderIngestion.toRegistration(),
    ::SkuRedactor.toRegistration(),
    ::Consumer.toRegistration()
  )

  @Test
  fun shop_redactsSku() = runBlocking {
    val arc = env.startArc(ShopPlan)

    // Ensure that the shop recipe is fully processed.
    withTimeout(30000) {
      SkuRedactor.redacted.join()
      Consumer.updated.join()
    }

    env.stopArc(arc)
  }
}
