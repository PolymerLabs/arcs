package wasm.kotlin.tests.arcs

import arcs.*
import arcs.wasm.toAddress
import kotlin.native.internal.ExportForCppRuntime

class AutoRenderTest : Particle() {
    private val data = Singleton { AutoRenderTest_Data() }

    init {
        registerHandle("data", data)
    }

    override fun init() = renderOutput()
    override fun onHandleUpdate(handle: Handle) = renderOutput()
    override fun onHandleSync(handle: Handle, allSynced: Boolean) = renderOutput()
    override fun getTemplate(slotName: String): String = data.get()?.txt ?: "empty"
}

@Retain
@ExportForCppRuntime("_newAutoRenderTest")
fun constructAutoRenderTest() = AutoRenderTest().toAddress()
