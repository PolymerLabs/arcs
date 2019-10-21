package arcs.android.accelerator

import arcs.android.accelerator.Log.logger
import arcs.api.Constants

/**
 * Loosely based on pipes-shell/source/verbs/run-arc.js. Instantiates the given recipe, with
 * the given particles, in a currently running, or new arc.
 */
class RunArcMessage(val arcId: String, val pecId: String, val recipe: String,
                    val particles: List<ParticleData> = emptyList()) : ShellMessage(Constants.RUN_ARC_MESSAGE) {
  override fun process(accelerator: AcceleratorPipesShell) {
    logger.info("Running $recipe in Arc $arcId on Pec $pecId with $particles")
    val action = accelerator.findRecipeByName(recipe)

    if (action == null) {
      logger.warning("found no recipes matching [${recipe}]")
      return
    }

    val arc = accelerator.spawnOrFindArc(arcId)
    // optionally instantiate recipe
    if (accelerator.instantiateRecipe(arc, action, particles)) {
      logger.info("successfully instantiated ${recipe} in $arc")
    }
  }
}