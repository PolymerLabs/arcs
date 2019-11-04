package arcs.tutorials

import arcs.*
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class DisplayGreetingParticle : Particle() {
    //private val person = Singleton { DisplayGreeting_Person() }

    override fun getTemplate(slotName: String) = """
<span>{{name}}</span>"""

    // init {
    //     registerHandle("person", person)
    // }

    // override fun onHandleUpdate(handle: Handle) {
    //     populateModel("mySlot", mapOf("" to ""))
    // }

    override fun populateModel(slotName: String, model: Map<String, String?>): Map<String, String?> {
        return model + mapOf(
            "name" to "Sarah"
        )
    }


}

@Retain
@ExportForCppRuntime()
fun _newDisplayGreeting() = DisplayGreetingParticle().toWasmAddress()
