package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class BasicTemplateParticle : Particle() {

  override fun populateModel(slotName: String, model: Map<String, String>): Map<String, String> {
    return model + mapOf(
      "name" to "Human"
    )
  } 

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
        return """<b>Hello, <span>{{name}}</span>!</b>"""
      }
}

@Retain
@ExportForCppRuntime("_newBasicTemplateParticle")
fun constructBasicTemplateParticle(): WasmAddress {
    log("_newBasicTemplateParticle called")
    return BasicTemplateParticle().toWasmAddress()
}
