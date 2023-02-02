package arcs.showcase.queries

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.host.toRegistration
import arcs.core.testutil.handles.dispatchFetchAll
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class QueriesShowcaseTest {

  @get:Rule
  val env = IntegrationEnvironment(
    ::ProductClassifier.toRegistration(),
    ::ProductDatabase.toRegistration()
  )

  /**
   * Tests that a set of known queries, on known runtime data produce expected results.
   * - Products are defined in [ProductDatabase],
   * - filtering criteria are defined in [ProductClassifier].
   */
  @Test
  fun testQueries() = runBlocking {
    val arc = env.startArc(ClassifyProductsPlan)
    val productClassifier: ProductClassifier = env.getParticle<ProductClassifier>(arc)
    val productDescriptions = productClassifier.handles.productDescriptions.dispatchFetchAll()
    val descriptions = productDescriptions.map { it.description }

    assertThat(descriptions).containsExactly(
      "Pencil: cheap, selected",
      "Ice cream: cheap",
      "Chocolate: cheap",
      "Hat: expensive",
      "Stop sign: expensive"
    )

    env.stopArc(arc)
  }
}
