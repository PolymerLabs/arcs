package arcs.tutorials

import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class ChildParticle : Particle() {
    override fun getTemplate(slotName: String): String {
        return "Child"
    }
}

@Retain
@ExportForCppRuntime("_newChildParticle")
fun _newChildParticle(): WasmAddress = ChildParticle().toWasmAddress()