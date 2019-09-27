package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class ParentParticle : Particle() {

  override fun onHandleUpdate(handle: Handle) {
    renderSlot("root")
    //renderSlot("mySlot")
  }

  override fun onHandleSync(handle: Handle, willSync: Boolean) {
    if(willSync) {
      log("All handles synched\n")
      renderSlot("root")
      //renderSlot("mySlot")
    }
  }

    private fun console(s: String) {
      log(s)
    }

    override fun getTemplate(slotName: String): String {
      log("In Parent Getting Template")
        return """<b>Hello:</b><div slotId="mySlot"></div>"""
    }
}

@Retain
@ExportForCppRuntime("_newParentParticle")
fun constructParentParticle(): WasmAddress {
    log("_newParentParticle called")
    return ParentParticle().toWasmAddress()
}