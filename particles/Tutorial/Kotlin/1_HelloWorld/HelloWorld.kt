package arcs.tutorials

/**
 * Sample WASM Particle.
 */
class HelloWorld : AbstractHelloWorld() {
  override fun getTemplate(slotName: String) = "<b>Hello, world!</b>"
}
