package arcs.tutorials

import arcs.addressable.toAddress
import arcs.Particle
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class HelloWorldParticle : Particle() {
    override fun getTemplate(slotName: String) = "<b>Hello, world!</b>"
}

@Retain
@ExportForCppRuntime("_newHelloWorldParticle")
fun constructHelloWorldParticle() = HelloWorldParticle().toAddress()
