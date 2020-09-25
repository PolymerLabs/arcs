package arcs.showcase.imports

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.host.toRegistration
import arcs.showcase.ShowcaseEnvironment
import arcs.showcase.imports.particles.AcceptImports
import arcs.showcase.imports.particles.IngestDock
import arcs.showcase.imports.recipes.GatherImportsPlan
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class ImportsTest {

  @get:Rule
  val env = ShowcaseEnvironment(
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
