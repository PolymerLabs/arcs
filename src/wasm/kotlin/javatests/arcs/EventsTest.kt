package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class EventsTest : Particle() {
    private val output = Singleton { EventsTest_Output() }

    init {
        registerHandle("output", output)
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        output.set(EventsTest_Output(txt = "event:$slotName:$eventName:${eventData["info"]}"))
    }
}

@Retain
@ExportForCppRuntime("_newEventsTest")
fun constructEventTest(): WasmAddress = EventsTest().toWasmAddress()
