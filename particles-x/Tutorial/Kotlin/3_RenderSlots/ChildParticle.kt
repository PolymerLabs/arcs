package arcs.tutorials

import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class ChildParticle : Particle() {
    override fun getTemplate(slotName: String) = "Child"
}

@Retain
@ExportForCppRuntime()
fun _newChildParticle() = ChildParticle().toWasmAddress()