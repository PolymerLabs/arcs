package arcs

import java.lang.StringBuilder

class HandleSyncUpdateTest : Particle() {

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        val out = Test_data(txt = "sync: ${handle.name}", flg = allSynced)
        _output.set(out)
    }

    override fun onHandleUpdate(handle: Handle) {
        val input = (handle as Singleton<*>).get() as Test_data?;
        val out = input?.let { Test_data(input.num, "update: ${handle.name}") }
                ?: Test_data(txt = "unexpected handle name: ${handle.name}")

        _output.set(out)
    }

    private val _input1 = Singleton { Test_data() }
    private val _input2 = Singleton { Test_data() }
    private val _output = Singleton { Test_data() }

    init {
        registerHandle("input1", _input1)
        registerHandle("input2", _input2)
        registerHandle("output", _output)
    }
}

class RenderTest : Particle() {

    override fun getTemplate(slotName: String): String {
        return "abc"
    }

    override fun populateModel(slotName: String, model: Map<String, String>): Map<String, String> {
        return mapOf("foo" to "bar")
    }

    override fun onHandleUpdate(handle: Handle) {
        val flags = _flags.get()
        flags?.let {
            renderSlot("root", flags.template, flags.model)
        }
    }

    private val _flags = Singleton { Test_renderFlags() }

    init {
        registerHandle("flags", _flags)
    }

}

class AutoRenderTest : Particle() {

    override fun getTemplate(slotName: String): String {
        return _data.get()?.txt ?: "empty"
    }

    private val _data = Singleton { Test_data() }

    init {
        registerHandle("data", _data)
    }
}

class EventTest : Particle() {

    override fun fireEvent(slotName: String, eventName: String) {
        _output.set(Test_data(txt = "event:$slotName:$eventName"))
    }

    private val _output = Singleton { Test_data() }
    init {
        registerHandle("output", _output)
    }
}

class ServiceTest : Particle() {
    private val _output = Singleton { Test_serviceResponse() }
    init {
        registerHandle("output", _output)
    }

    override fun init() {
        val url: String = resolveUrl("\$resolve-me")
        _output.set(Test_serviceResponse("resolveUrl", payload = url))

        serviceRequest("random.next", mapOf(), "first")
        serviceRequest("random.next", mapOf(), "second")
        serviceRequest("clock.now", mapOf("timeUnit" to "DAYS"))
    }

    override fun serviceResponse(call: String, response: Map<String, String>, tag: String) {
        val builder = StringBuilder()
        response.entries
                .map { entry -> "${entry.key}:${entry.value};" }
                .forEach { str -> builder.append(str)}
        val payload = builder.toString()

        _output.set(Test_serviceResponse(call, tag, payload))
    }

}

class MissingRegisterHandleTest : Particle() {}

class UnconnectedHandlesTest : Particle() {

    override fun fireEvent(slotName: String, eventName: String) {
        _data.set(Test_data())
    }

    private val _data = Singleton { Test_data() }

    init {
        registerHandle("data", _data)
    }

}

