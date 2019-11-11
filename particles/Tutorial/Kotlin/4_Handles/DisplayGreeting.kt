package arcs.tutorials

import arcs.*
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class DisplayGreetingParticle : Particle() {
    private val person = Singleton { DisplayGreeting_Person() }

    override fun getTemplate(slotName: String) = "Hello, <span>{{name}}</span>!"

     init {
         registerHandle("person", person)
     }

    override fun onHandleUpdate(handle: Handle) {
         this.renderOutput()
    }

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {
        val n = person.get()!!.name ?: "Human"
        return model + mapOf(
            "name" to n
        )
    }
}

@Retain
@ExportForCppRuntime()
fun _newDisplayGreeting() = DisplayGreetingParticle().toWasmAddress()
