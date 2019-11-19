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
                val d1 = CollectionApiTest_OutHandle()
                val iter = in_.iterator()
                val i1 = iter.next()
                d1.txt = i1.toString()
                d1.num = d1.num?.times(2)
                d1.flg = iter.hasNext()
                out_.store(d1)

                val d2 = CollectionApiTest_OutHandle()
                val i2 = iter.next()
                d2.txt = if (i1.equals(i2)) "eq" else "ne"
                d2.flg = iter.hasNext()
                out_.store(d2)

                val d3 = CollectionApiTest_OutHandle()
                val i3 = iter.next()
                d3.txt = if (i2.equals(i1)) "ne" else "eq"
                d3.flg = iter.hasNext()
                out_.store(d3)
            }
            "case5" -> {
                // TODO(alxr)

            }
        }
    }
}

@Retain
@ExportForCppRuntime("_newCollectionApiTest")
fun constructCollectionApiTest(): WasmAddress = CollectionApiTest().toWasmAddress()
