package arcs.tutorials

import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class HelloWorldParticle : Particle() {
    override fun getTemplate(slotName: String) = "<b>Hello, world!</b>"
}

@Retain
@ExportForCppRuntime("_newHelloWorldParticle")
fun constructHelloWorldParticle() = HelloWorldParticle().toWasmAddress()
