package arcs

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
fun constructParentParticle(): WasmAddress {
    return ParentParticle().toWasmAddress()
}