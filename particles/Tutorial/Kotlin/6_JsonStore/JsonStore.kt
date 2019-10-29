package arcs.tutorials

import arcs.Particle
import arcs.WasmAddress
import arcs.Singleton
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample Kotlin-WASM Particle to use a JSON store.
 */
class JsonStoreParticle : Particle() {

    private val res = Singleton { JsonStoreParticle_InputData() }
    init {
        registerHandle("inputData", res)
    }

    override fun populateModel(slotName: String, model: Map<String, String>): Map<String, String> {
        val person = res.get() ?: JsonStoreParticle_InputData("", 0.0);

        return model + mapOf(
            "name" to person.name,
            "age" to person.age.toString()
        )
    }

    override fun getTemplate(slotName: String): String {
        return "<b>Hello, <span>{{name}}</span>, aged <span>{{age}}</span>!</b>"
    }
}

@Retain
@ExportForCppRuntime("_newJsonStoreParticle")
fun constructJsonStoreParticle() = JsonStoreParticle().toWasmAddress()
