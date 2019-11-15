package wasm.kotlin.tests.arcs

import arcs.Collection
import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class ServicesTest : Particle() {
    private val output = Collection { ServicesTest_Output() }

    init {
        registerHandle("output", output)
    }

    override fun init() {
        val url: String = resolveUrl("\$resolve-me")
        output.store(ServicesTest_Output("resolveUrl", payload = url))

        serviceRequest("random.next", mapOf(), "first")
        serviceRequest("random.next", mapOf(), "second")
        serviceRequest("clock.now", mapOf("timeUnit" to "DAYS"))
    }

    override fun serviceResponse(call: String, response: Map<String, String>, tag: String) {
        val builder = StringBuilder()
        response.entries
            .map { entry -> "${entry.key}:${entry.value};" }
            .forEach { str -> builder.append(str) }
        val payload = builder.toString()

        output.store(ServicesTest_Output(call, tag, payload))
    }
}

@Retain
@ExportForCppRuntime("_newServicesTest")
fun constructServiceTest(): WasmAddress = ServicesTest().toWasmAddress()
