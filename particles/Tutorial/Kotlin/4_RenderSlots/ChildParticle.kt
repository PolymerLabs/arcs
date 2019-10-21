package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class ChildParticle : Particle() {
    override fun getTemplate(slotName: String): String {
        return """Child"""
    }
}

@Retain
@ExportForCppRuntime("_newChildParticle")
fun constructChildParticle(): WasmAddress {
    return ChildParticle().toWasmAddress()
}