package wasm.kotlin.tests.arcs

import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class RenderTest : Particle() {
    private val flags = Singleton { RenderTest_Flags() }
    private var shouldTemplate: Boolean = true
    private var shouldPopulate: Boolean = true

    init {
        registerHandle("flags", flags)
    }

    override fun init() {
        renderOutput()
    }

    override fun getTemplate(slotName: String): String? = if (shouldTemplate) "abc" else null

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?>? =
        if (shouldPopulate) mapOf("foo" to "bar") else null

    override fun onHandleUpdate(handle: Handle) {
        flags.get()?.let {
            shouldTemplate = it.template ?: true
            shouldPopulate = it.model ?: true
        }
        renderOutput()
    }
}

@Retain
@ExportForCppRuntime("_newRenderTest")
fun constructRenderTest(): WasmAddress = RenderTest().toWasmAddress()
