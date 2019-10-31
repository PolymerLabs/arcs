package wasm.kotlin.tests.arcs

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime


class HandleSyncUpdateTest : Particle() {
    private val input1 = Singleton { Test_Data() }
    private val input2 = Singleton { Test_Data() }
    private val output = Collection { Test_Data() }

    init {
        registerHandle("input1", input1)
        registerHandle("input2", input2)
        registerHandle("output", output)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        val out = Test_Data(txt = "sync:${handle.name}", flg = allSynced)
        output.store(out)
    }

    override fun onHandleUpdate(handle: Handle) {
        val input = (handle as Singleton<*>).get() as Test_Data?
        val out = input?.let { Test_Data(input.num, "update:${handle.name}") }
            ?: Test_Data(txt = "unexpected handle name: ${handle.name}")

        output.store(out)
    }
}

@Retain
@ExportForCppRuntime("_newHandleSyncUpdateTest")
fun constructHandleSyncUpdateTest(): WasmAddress = HandleSyncUpdateTest().toWasmAddress()