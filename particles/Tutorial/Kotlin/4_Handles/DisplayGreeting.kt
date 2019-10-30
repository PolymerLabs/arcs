package arcs.tutorials

import arcs.*
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class DisplayGreetingParticle : Particle() {
    //private val person = Singleton { DisplayGreeting_Person() }

    override fun getTemplate(slotName: String) = """
<input value="{{name}}" placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
<div slotid="greetingSlot"></div>"""

    // init {
    //     registerHandle("person", person)
    // }

    // override fun onHandleUpdate(handle: Handle) {
    //     populateModel("mySlot", mapOf("" to ""))
    // }

    override fun populateModel(slotName: String, model: Map<String, String>): Map<String, String> {
        return model + mapOf(
            "name" to "person.name"
        )
    }


}

@Retain
@ExportForCppRuntime()
fun _newDisplayGreeting() = DisplayGreetingParticle().toWasmAddress()