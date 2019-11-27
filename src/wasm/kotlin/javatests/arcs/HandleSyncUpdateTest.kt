package wasm.kotlin.javatests.arcs

import arcs.*
import arcs.wasm.toAddress
import kotlin.native.internal.ExportForCppRuntime
import kotlin.native.Retain

class HandleSyncUpdateTest : Particle() {
    private val sng = Singleton { HandleSyncUpdateTest_Sng() }
    private val col = Collection { HandleSyncUpdateTest_Col() }
    private val res = Collection { HandleSyncUpdateTest_Res() }

    init {
        registerHandle("sng", sng)
        registerHandle("col", col)
        registerHandle("res", res)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        res.store(HandleSyncUpdateTest_Res(txt = "sync:${handle.name}:$allSynced"))
    }

    override fun onHandleUpdate(handle: Handle) {
        val out = HandleSyncUpdateTest_Res()
        out.txt = "update:${handle.name}"
        if (handle.name == "sng") {
            val data = (handle as Singleton<*>).get() as HandleSyncUpdateTest_Sng
            out.num = data.num
        } else if (handle.name == "col") {
            val data = (handle as Collection<*>).iterator().next() as HandleSyncUpdateTest_Col
            out.num = data.num
        } else {
            out.txt = "unexpected handle name: ${handle.name}"
        }
        res.store(out)
    }
}

@Retain
@ExportForCppRuntime("_newHandleSyncUpdateTest")
fun constructHandleSyncUpdateTest() = HandleSyncUpdateTest().toAddress()
