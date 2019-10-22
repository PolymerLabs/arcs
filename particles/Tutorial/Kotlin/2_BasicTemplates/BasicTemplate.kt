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

    override fun getTemplate(slotName: String): String {
        return """<b>Hello, <span>{{name}}</span>!</b>"""
    }
}

@Retain
@ExportForCppRuntime("_newBasicTemplateParticle")
fun constructBasicTemplateParticle(): WasmAddress {
    return BasicTemplateParticle().toWasmAddress()
}
