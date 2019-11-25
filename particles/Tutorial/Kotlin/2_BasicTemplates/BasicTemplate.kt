package arcs.tutorials

import arcs.Particle
import arcs.wasm.toAddress
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class BasicTemplateParticle : Particle() {

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {
        return model + mapOf(
            "name" to "Human"
        )
    }

    override fun getTemplate(slotName: String) = "<b>Hello, <span>{{name}}</span>!</b>"
}

@Retain
@ExportForCppRuntime("_newBasicTemplateParticle")
fun constructBasicTemplateParticle() = BasicTemplateParticle().toAddress()
