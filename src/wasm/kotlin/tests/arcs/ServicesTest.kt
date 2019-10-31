package wasm.kotlin.tests.arcs

import arcs.Collection
import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime

class ServicesTest : Particle() {
    private val output = Collection { Test_ServiceResponse() }

    init {
        registerHandle("output", output)
    }

    override fun init() {
        val url: String = resolveUrl("\$resolve-me")
        output.store(Test_ServiceResponse("resolveUrl", payload = url))

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

        output.store(Test_ServiceResponse(call, tag, payload))
    }
}

@Retain
@ExportForCppRuntime("_newServicesTest")
fun constructServiceTest(): WasmAddress = ServicesTest().toWasmAddress()