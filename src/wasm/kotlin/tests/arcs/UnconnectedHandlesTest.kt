package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Singleton
import arcs.WasmAddress

import kotlin.native.internal.ExportForCppRuntime


class UnconnectedHandlesTest : Particle() {
    private val data = Singleton { Test_Data() }

    init {
        registerHandle("data", data)
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        data.set(Test_Data())
    }
}

@Retain
@ExportForCppRuntime("_newUnconnectedHandlesTest")
fun constructUnconnectedHandlesTest(): WasmAddress = UnconnectedHandlesTest().toWasmAddress()
