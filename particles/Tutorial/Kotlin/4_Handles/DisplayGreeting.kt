package arcs.tutorials

import arcs.Handle
import arcs.Particle
import arcs.Singleton
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
        return model + mapOf(
            "name" to (person.get()?.name ?: "Human")
        )
    }
}

@Retain
@ExportForCppRuntime()
fun _newDisplayGreeting() = DisplayGreetingParticle().toWasmAddress()
