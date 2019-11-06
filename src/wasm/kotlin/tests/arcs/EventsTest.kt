package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class EventsTest : Particle() {
    private val output = Singleton { Test_Data() }

    init {
        registerHandle("output", output)
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        output.set(Test_Data(txt = "event:$slotName:$eventName:${eventData["info"]}"))
    }
}

@Retain
@ExportForCppRuntime("_newEventsTest")
fun constructEventTest(): WasmAddress = EventsTest().toWasmAddress()
