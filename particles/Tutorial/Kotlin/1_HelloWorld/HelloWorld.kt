package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class HelloWorldParticle : Particle() {

  override fun onHandleUpdate(handle: Handle) {
    renderSlot("root")
  }

  override fun onHandleSync(handle: Handle, willSync: Boolean) {
    if(willSync) {
      log("All handles synched\n")
      renderSlot("root")
    }
  }

    private fun console(s: String) {
      log(s)
    }

    override fun getTemplate(slotName: String): String {
        return """<b>Hello, world!</b>"""
      }
}

@Retain
@ExportForCppRuntime("_newHelloWorldParticle")
fun constructHelloWorldParticle(): WasmAddress {
    log("_newHelloWorldParticle called")
    return HelloWorldParticle().toWasmAddress()
}
