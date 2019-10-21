package arcs.android.accelerator

import arcs.android.accelerator.Log.logger
import arcs.api.Constants

/**
 * Stop an existing arc and clean up any resources held by it.
 */
class StopArcMessage(val arcId: String, val pecId: String) : ShellMessage(Constants.STOP_ARC_MESSAGE) {
  override fun process(accelerator: AcceleratorPipesShell) {
    logger.info("NOT IMPLEMENTED: Stopping arc $arcId with pec $pecId!")
  }
}