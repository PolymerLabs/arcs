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
        <div slotid="greetingSlot"></div>""".trimIndent()

    init {
      registerHandle("person", person)

      eventHandler("onNameInputChange") {
        val p = person.get() ?: GetPerson_Person()
        p.name = it["value"] ?: "Human"
        person.set(p)
      }
    }
}

@Retain
@ExportForCppRuntime()
fun _newGetPerson() = GetPersonParticle().toWasmAddress()
