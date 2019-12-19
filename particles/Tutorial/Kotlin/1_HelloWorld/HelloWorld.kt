package arcs.tutorials

import arcs.sdk.kotlin.Particle

/**
 * Sample WASM Particle.
 */
class HelloWorld : Particle() {
    override fun getTemplate(slotName: String) = "<b>Hello, world!</b>"
}
