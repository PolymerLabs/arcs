package arcs.tutorials

import arcs.sdk.Particle

/**
 * Sample WASM Particle.
 */
class BasicTemplate : Particle() {

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        return model + mapOf(
            "name" to "Human"
        )
    }

    override fun getTemplate(slotName: String) = "<b>Hello, <span>{{name}}</span>!</b>"
}
