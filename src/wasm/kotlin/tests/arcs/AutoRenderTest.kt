package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class AutoRenderTest : Particle() {
    private val data = Singleton { Test_Data() }

    init {
        registerHandle("data", data)
    }

    override fun getTemplate(slotName: String): String {
        return data.get()?.txt ?: "empty"
    }
}

@Retain
@ExportForCppRuntime("_newAutoRenderTest")
fun constructAutoRenderTest(): WasmAddress = AutoRenderTest().toWasmAddress()