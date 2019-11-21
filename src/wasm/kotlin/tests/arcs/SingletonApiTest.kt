package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class SingletonApiTest : Particle() {
    private val in_ = Singleton { SingletonApiTest_InHandle() }
    private val out_ = Singleton { SingletonApiTest_OutHandle() }
    private val io_ = Singleton { SingletonApiTest_IoHandle() }

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
                val input = in_.get()
                val d = SingletonApiTest_OutHandle(num=input?.num, txt=input?.txt)
                d.num  = d.num?.times(2)
                out_.set(d)
            }
            "case3" -> {
                val input = in_.get()
                val d = SingletonApiTest_IoHandle(num=input?.num, txt=input?.txt)
                d.num = d.num?.times(3)
                io_.set(d)
            }
        }
    }
}

@Retain
@ExportForCppRuntime("_newSingletonApiTest")
fun constructSingletonApiTest(): WasmAddress = SingletonApiTest().toWasmAddress()
