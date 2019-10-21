package arcs.android.accelerator

import arcs.android.accelerator.Log.logger
import com.beust.klaxon.Klaxon
import java.util.logging.Logger

object Log {
  val logger: Logger = Logger.getLogger(AcceleratorPipesShell::class.java.name)
}

/**
 * Implements a version of the Pipes-Shell directly in Kotlin. Responds to the same
 * commands as the normal runtime, except that manifest information and recipe resolution
 * has been performed at build time. This is an inbetween state of removing the
 * PEH/PEC completely in Particle Accelerator.
 */
class AcceleratorPipesShell(private val arcById: MutableMap<String, Arc> = mutableMapOf()) {

  fun receive(json: String) {
    logger.info("JSON: $json")
    parseMessage(json)?.process(this)
  }

  fun parseMessage(json: String) = Klaxon()
      .parse<ShellMessage>(json)

  fun findRecipeByName(recipe: String): Any? {
    when (recipe) {
      "IngestPeople" -> IngestPeopleRecipe()
    }
    return null
  }

  fun spawnOrFindArc(arcId: String): Arc {
    if (!arcById.containsKey(arcId)) {
      arcById[arcId] = Arc(arcId)
    }
    return arcById[arcId]!!
  }

  fun instantiateRecipe(arc: Arc, action: Any, particles: List<ParticleData>): Boolean {
    return true
  }
}