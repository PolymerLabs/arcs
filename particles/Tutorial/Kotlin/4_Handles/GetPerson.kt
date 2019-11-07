package arcs.tutorials

import arcs.Particle
import arcs.Singleton
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class GetPersonParticle : Particle() {
    private val person = Singleton { GetPerson_Person() }

    override fun getTemplate(slotName: String) = """
        <input placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
        <div slotid="greetingSlot"></div>""".trimIndent()

    init {
        registerHandle("person", person)

        eventHandler("onNameInputChange") { eventData ->
            val p = person.get() ?: GetPerson_Person()
            p.name = eventData["value"] ?: "Human"
            person.set(p)
        }
    }
}

@Retain
@ExportForCppRuntime()
fun _newGetPerson() = GetPersonParticle().toWasmAddress()
