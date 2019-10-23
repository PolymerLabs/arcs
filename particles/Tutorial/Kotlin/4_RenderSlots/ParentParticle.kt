package arcs.tutorials

import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class ParentParticle : Particle() {
    override fun getTemplate(slotName: String): String {
        return """<b>Hello:</b><div slotId="mySlot"></div>"""
    }
}

@Retain
@ExportForCppRuntime("_newParentParticle")
fun _newParentParticle(): WasmAddress = ParentParticle().toWasmAddress()