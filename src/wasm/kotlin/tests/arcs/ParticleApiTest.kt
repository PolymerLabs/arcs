package arcs


class HandleSyncUpdateTest : Particle() {
    private val input1 = Singleton { Test_data() }
    private val input2 = Singleton { Test_data() }
    private val output = Singleton { Test_data() }

    init {
        registerHandle("input1", input1)
        registerHandle("input2", input2)
        registerHandle("output", output)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        val out = Test_data(txt = "sync: ${handle.name}", flg = allSynced)
        output.set(out)
    }

    override fun onHandleUpdate(handle: Handle) {
        val input = (handle as Singleton<*>).get() as Test_data?
        val out = input?.let { Test_data(input.num, "update: ${handle.name}") }
                ?: Test_data(txt = "unexpected handle name: ${handle.name}")

        output.set(out)
    }
}

class RenderTest : Particle() {
    private val flags = Singleton { Test_renderFlags() }

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
            renderSlot("root", flags.template, flags.model)
        }
    }
}

class AutoRenderTest : Particle() {
    private val data = Singleton { Test_data() }

    init {
        registerHandle("data", data)
    }

    override fun getTemplate(slotName: String): String {
        return data.get()?.txt ?: "empty"
    }
}

class EventTest : Particle() {
    private val output = Singleton { Test_data() }

    init {
        registerHandle("output", output)
    }

    override fun fireEvent(slotName: String, eventName: String) {
        output.set(Test_data(txt = "event:$slotName:$eventName"))
    }
}

class ServiceTest : Particle() {
    private val output = Singleton { Test_serviceResponse() }

    init {
        registerHandle("output", output)
    }

    override fun init() {
        val url: String = resolveUrl("\$resolve-me")
        output.set(Test_serviceResponse("resolveUrl", payload = url))

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

        output.set(Test_serviceResponse(call, tag, payload))
    }
}

class MissingRegisterHandleTest : Particle() {}

class UnconnectedHandlesTest : Particle() {
    private val data = Singleton { Test_data() }

    init {
        registerHandle("data", data)
    }

    override fun fireEvent(slotName: String, eventName: String) {
        data.set(Test_data())
    }
}

