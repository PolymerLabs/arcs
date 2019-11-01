package wasm.kotlin.tests.arcs

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime


class HandleSyncUpdateTest : Particle() {
    private val sng = Singleton { Test_Data() }
    private val col = Collection { Test_Data() }
    private val res = Collection { Test_Data() }

    init {
        registerHandle("sng", sng)
        registerHandle("col", col)
        registerHandle("res", res)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        res.store(Test_Data(txt = "sync:${handle.name}:${allSynced}"))
    }

    override fun onHandleUpdate(handle: Handle) {
        val out = Test_Data()
        out.txt = "update:${handle.name}"
        if (handle.name == "sng") {
            val data = (handle as Singleton<*>).get() as Test_Data
            out.num = data.num
        } else if (handle.name == "col") {
            val data = (handle as Collection<*>).iterator().next() as Test_Data
            out.num = data.num
        } else {
            out.txt = "unexpected handle name: ${handle.name}"
        }
        res.store(out)
    }
}

@Retain
@ExportForCppRuntime("_newHandleSyncUpdateTest")
fun constructHandleSyncUpdateTest(): WasmAddress = HandleSyncUpdateTest().toWasmAddress()
