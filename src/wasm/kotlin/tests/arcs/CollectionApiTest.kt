package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Collection
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class CollectionApiTest : Particle() {
    private val in_ = Collection { CollectionApiTest_InHandle() }
    private val out_ = Collection { CollectionApiTest_OutHandle() }
    private val io_ = Collection { CollectionApiTest_IoHandle() }
    private val stored = CollectionApiTest_OutHandle()

    init {
        registerHandle("inHandle", in_)
        registerHandle("outHandle", out_)
        registerHandle("ioHandle", io_)
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "case1" -> {
                out_.clear()
                io_.clear()
            }
            "case2" -> {
                stored.flg = in_.isEmpty()
                stored.num = in_.size
                out_.store(stored)
            }
            "case3" -> {
                out_.remove(stored)
            }
            "case4" -> {

            }
        }
    }
}

@Retain
@ExportForCppRuntime("_newCollectionApiTest")
fun constructCollectionApiTest(): WasmAddress = CollectionApiTest().toWasmAddress()
