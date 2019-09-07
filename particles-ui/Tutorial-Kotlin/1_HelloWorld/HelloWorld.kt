package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class HelloWorldParticle : Particle() {

  override fun onHandleUpdate(handle: Handle) {
    log("onHandleUpdate called")
    renderSlot("root")
  }

  override fun onHandleSync(handle: Handle, willSync: Boolean) {
    log("onHandleSync called")
    if (willSync) {
      log("All handles synched\n")
      renderSlot("root")
    }
  }

  override fun getTemplate(slotName: String): String {
    log("getTemplate\n")
    return """<b>Hello, world!</b>"""
  }

}

@Retain
@ExportForCppRuntime("_newHelloWorldParticle")
fun constructHelloWorldParticle(): WasmAddress {
    log("constructHelloWorldParticle called")
    return HelloWorldParticle().toWasmAddress()
}
