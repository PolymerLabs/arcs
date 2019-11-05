package arcs.tutorials

import arcs.*
import kotlin.native.internal.ExportForCppRuntime


/**
 * Sample WASM Particle.
 */
class GetPersonParticle : Particle() {

    private val person = Singleton { GetPerson_Person() }

    override fun getTemplate(slotName: String) = """
<input placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
<div slotid="greetingSlot"></div>
"""

    init {
      //registerHandle("person", person)

      eventHandler("onNameInputChange") {
        log("Data: ${it.get("value")}")
      }
    }

}

@Retain
@ExportForCppRuntime()
fun _newGetPerson() = GetPersonParticle().toWasmAddress()
