package arcs.tutorials

import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class HelloWorldParticle : Particle() {
    override fun getTemplate(slotName: String): String {
        return "<b>Hello, world!</b>"
    }
}

@Retain
@ExportForCppRuntime("_newHelloWorldParticle")
fun constructHelloWorldParticle(): WasmAddress = HelloWorldParticle().toWasmAddress()
