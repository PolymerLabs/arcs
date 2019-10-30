package arcs

import kotlin.native.internal.ExportForCppRuntime

class HandleSyncUpdateTest : Particle() {
    private val input1 = Singleton { Test_Data() }
    private val input2 = Singleton { Test_Data() }
    private val output = Collection { Test_Data() }

    init {
        registerHandle("input1", input1)
        registerHandle("input2", input2)
        registerHandle("output", output)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        val out = Test_Data(txt = "sync:${handle.name}", flg = allSynced)
        output.store(out)
    }

    override fun onHandleUpdate(handle: Handle) {
        val input = (handle as Singleton<*>).get() as Test_Data?
        val out = input?.let { Test_Data(input.num, "update: ${handle.name}") }
                ?: Test_Data(txt = "unexpected handle name: ${handle.name}")

        output.store(out)
    }
}

@Retain
@ExportForCppRuntime("_newHandleSyncUpdateTest")
fun constructHandleSyncUpdateTest(): WasmAddress = HandleSyncUpdateTest().toWasmAddress()


class RenderTest : Particle() {
    private val flags = Singleton { Test_RenderFlags() }

    init {
        registerHandle("flags", flags)
    }

    override fun getTemplate(slotName: String): String {
        return "abc"
    }

    override fun populateModel(slotName: String, model: Map<String, String>): Map<String, String> {
        return mapOf("foo" to "bar")
    }

    override fun onHandleUpdate(handle: Handle) {
        val flags = flags.get()
        flags?.let {
            renderSlot("root", flags.template ?: true, flags.model ?: true)
        }
    }
}

@Retain
@ExportForCppRuntime("_newRenderTest")
fun constructRenderTest(): WasmAddress = RenderTest().toWasmAddress()

class AutoRenderTest : Particle() {
    private val data = Singleton { Test_Data() }

    init {
        registerHandle("data", data)
    }

    override fun getTemplate(slotName: String): String {
        return data.get()?.txt ?: "empty"
    }
}

@Retain
@ExportForCppRuntime("_newAutoRenderTest")
fun constructAutoRenderTest(): WasmAddress = AutoRenderTest().toWasmAddress()

class EventTest : Particle() {
    private val output = Singleton { Test_Data() }

    init {
        registerHandle("output", output)
    }

    override fun fireEvent(slotName: String, eventName: String) {
        output.set(Test_Data(txt = "event:$slotName:$eventName"))
    }
}

@Retain
@ExportForCppRuntime("_newEventTest")
fun constructEventTest(): WasmAddress = EventTest().toWasmAddress()

class ServiceTest : Particle() {
    private val output = Singleton { Test_ServiceResponse() }

    init {
        registerHandle("output", output)
    }

    override fun init() {
        val url: String = resolveUrl("\$resolve-me")
        output.set(Test_ServiceResponse("resolveUrl", payload = url))

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

        output.set(Test_ServiceResponse(call, tag, payload))
    }
}

@Retain
@ExportForCppRuntime("_newServiceTest")
fun constructServiceTest(): WasmAddress = ServiceTest().toWasmAddress()

class MissingRegisterHandleTest : Particle() {}

@Retain
@ExportForCppRuntime("_newMissingRegisterHandleTest")
fun constructMissingRegisterHandleTest(): WasmAddress = MissingRegisterHandleTest().toWasmAddress()

class UnconnectedHandlesTest : Particle() {
    private val data = Singleton { Test_Data() }

    init {
        registerHandle("data", data)
    }

    override fun fireEvent(slotName: String, eventName: String) {
        data.set(Test_Data())
    }
}

@Retain
@ExportForCppRuntime("_newUnconnectedHandlesTest")
fun constructUnconnectedHandlesTest(): WasmAddress = UnconnectedHandlesTest().toWasmAddress()
