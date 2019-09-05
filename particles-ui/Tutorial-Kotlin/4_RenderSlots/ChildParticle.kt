package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class ChildParticle : Particle() {

  override fun onHandleUpdate(handle: Handle) {
    renderSlot("mySlot")
  }

  override fun onHandleSync(handle: Handle, willSync: Boolean) {
    if(willSync) {
      log("All handles synched\n")
      renderSlot("mySlot")
    }
  }

    private fun console(s: String) {
      log(s)
    }

    override fun getTemplate(slotName: String): String {
      log("In Child Getting Template")
      return """Child"""
    }
}

@Retain
@ExportForCppRuntime("_newChildParticle")
fun constructChildParticle(): WasmAddress {
    log("_newChildParticle called")
    return ChildParticle().toWasmAddress()
}
