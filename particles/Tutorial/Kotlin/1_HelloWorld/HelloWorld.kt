package arcs.tutorials

import arcs.Particle
import arcs.wasm.toAddress
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
