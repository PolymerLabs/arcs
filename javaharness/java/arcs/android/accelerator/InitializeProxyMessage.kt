package arcs.android.accelerator

import arcs.android.accelerator.Log.logger

class InitializeProxyMessage : MessageBody() {
  override fun processPecMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    logger.info("NOT IMPLEMENTED: InitializeProxyMessage $pecId")
  }
}