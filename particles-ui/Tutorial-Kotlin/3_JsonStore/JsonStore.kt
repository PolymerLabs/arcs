package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class JsonStoreParticle : Particle() {

  private val res = Singleton { PersonDetails() }
  init {
    registerHandle("inputData", res)
  }

  override fun populateModel(slotName: String, model: Map<String, String>): Map<String, String> {
    if(res.get() != null) {
      return model + mapOf(
        "name" to res.get()!!.name,
        "age" to res.get()!!.age.toString()
      )
    }
    return model + mapOf(
        "name" to "",
        "age" to "0"
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
        log("getting template")
        //return """Hello!"""
        return """<b>Hello, <span>{{name}}</span>, aged <span>{{age}}</span>!</b>"""
      }
}

@Retain
@ExportForCppRuntime("_newJsonStoreParticle")
fun constructJsonStoreParticle(): WasmAddress {
    log("_newJsonStoreParticle called")
    return JsonStoreParticle().toWasmAddress()
}
