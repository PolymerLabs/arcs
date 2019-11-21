package wasm.kotlin.tests.arcs

import arcs.Collection
import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class CollectionApiTest : Particle() {
    private val _in = Collection { CollectionApiTest_InHandle() }
    private val out = Collection { CollectionApiTest_OutHandle() }
    private val io = Collection { CollectionApiTest_IoHandle() }
    private val stored = CollectionApiTest_OutHandle()

    init {
        registerHandle("inHandle", _in)
        registerHandle("outHandle", out)
        registerHandle("ioHandle", io)
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "case1" -> {
                out.clear()
                io.clear()
            }
            "case2" -> {
                stored.flg = _in.isEmpty()
                stored.num = _in.size.toDouble()
                out.store(stored)
            }
            "case3" -> {
                out.remove(stored)
            }
            "case4" -> {
                val d1 = CollectionApiTest_OutHandle()
                val iter = _in.iterator()
                d1.flg = iter.hasNext()
                val i1 = iter.next()
                d1.txt = "{${i1.internalId}}, num: ${i1.num?.toInt()}"
                d1.num = i1.num?.let { it * 2 }
                out.store(d1)

                val d2 = CollectionApiTest_OutHandle()
                d2.txt = "eq"
                d2.flg = iter.hasNext()
                out.store(d2)

                val d3 = CollectionApiTest_OutHandle()
                d3.txt =  "ne"
                d3.flg = !iter.hasNext()
                out.store(d3)
            }
            "case5" -> {
                val extra = CollectionApiTest_IoHandle()

                extra.txt = "abc"
                io.store(extra)
                val d1 = CollectionApiTest_OutHandle(num = io.size.toDouble(), flg = io.isEmpty())
                out.store(d1)

                io.remove(extra)
                val d2 = CollectionApiTest_OutHandle(num = io.size.toDouble())
                out.store(d2)

                // Ranged iteration; order is not guaranteed so use 'num' to assign sorted array slots.
                val res = mutableListOf<String>()
                for (data in io) {
                    res.add("{${data.internalId}}, num: ${data.num?.toInt()}")
                }

                res
                    .map { s: String -> CollectionApiTest_OutHandle(txt = s) }
                    .forEach { h: CollectionApiTest_OutHandle -> out.store(h) }

                io.clear()
                val d3 = CollectionApiTest_OutHandle(num = io.size.toDouble(), flg = io.isEmpty())
                out.store(d3)
            }
        }
    }
}


@Retain
@ExportForCppRuntime("_newCollectionApiTest")
fun constructCollectionApiTest(): WasmAddress = CollectionApiTest().toWasmAddress()
