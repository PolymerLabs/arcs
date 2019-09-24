package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample Kotlin-WASM Particle to use a JSON store.
 */
class JsonStoreParticle : Particle() {

  private val res = Singleton { PersonDetails() }
  init {
    registerHandle("inputData", res)
  }

  override fun populateModel(slotName: String, model: Map<String, String>): Map<String, String> {
    val person = res.get() ?: PersonDetails("", 0.0);

    return model + mapOf(
      "name" to person.name,
      "age" to person.age.toString()
    )   
  } 

  override fun onHandleUpdate(handle: Handle) {
    renderSlot("root")
  }

  override fun onHandleSync(handle: Handle, allSynced: Boolean) {
    if(allSynced) {
      log("All handles synched")
      renderSlot("root")
    }
  }

  private fun console(s: String) {
    log(s)
  }

  override fun getTemplate(slotName: String): String {
    log("getting template")
      return """<b>Hello, <span>{{name}}</span>, aged <span>{{age}}</span>!</b>"""
  }
}

@Retain
@ExportForCppRuntime("_newJsonStoreParticle")
fun constructJsonStoreParticle(): WasmAddress {
  log("_newJsonStoreParticle called")
  return JsonStoreParticle().toWasmAddress()
}
