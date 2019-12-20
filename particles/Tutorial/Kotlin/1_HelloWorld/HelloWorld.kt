package arcs.tutorials

import arcs.sdk.common.Particle

/**
 * Sample WASM Particle.
 */
class HelloWorld : Particle() {
    override fun getTemplate(slotName: String) = "<b>Hello, world!</b>"
}
