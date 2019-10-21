package arcs.android.accelerator

class InitializeProxyMessage : MessageBody() {
  override fun processMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    Log.logger.info("InitializeProxyMessage received")
  }
}