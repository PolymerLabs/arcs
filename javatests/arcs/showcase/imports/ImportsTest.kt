package arcs.showcase.imports

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.host.toRegistration
import arcs.showcase.imports.particles.AcceptImports
import arcs.showcase.imports.particles.IngestDock
import arcs.showcase.imports.recipes.GatherImportsPlan
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class ImportsTest {

  @get:Rule
  val env = IntegrationEnvironment(
    ::IngestDock.toRegistration(),
    ::AcceptImports.toRegistration()
  )

  @Test
  fun teaShow_importTea() = runBlocking {
    val arc = env.startArc(GatherImportsPlan)

    withTimeout(30000) {
      IngestDock.dockUnloaded.join()
    }

    env.stopArc(arc)
  }
}
