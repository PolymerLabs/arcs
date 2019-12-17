package arcs.tutorials

import arcs.Particle

/**
 * Sample WASM Particle.
 */
class HelloWorld : Particle() {
    override fun getTemplate(slotName: String) = "<b>Hello, world!</b>"
}
