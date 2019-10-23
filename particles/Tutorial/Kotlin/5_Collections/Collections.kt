package arcs.tutorials

import arcs.*
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample Kotlin-WASM Particle to use a JSON store.
 */
class CollectionsParticle : Particle() {

    // private val res = Singleton { CollectionsParticle_inputData() }
    // init {
    //     registerHandle("inputData", res)
    // }

    override fun populateModel(slotName: String, model: Map<String, String>): Map<String, Any> {
        //val person = res.get() ?: CollectionsParticle_inputData("", 0.0);

        return model + mapOf(
            "people" to mapOf(
                "\$template" to "person",
                "models" to mapOf(
                    "name" to "Jack",
                    "age" to "7.0"
                )
            )
        )   
    }

    override fun getTemplate(slotName: String): String {
        return """Hello to everyone:
        <ul>{{people}}</ul>

        <template person>
          <!-- This template is given a model object. It can access the properties on that model via the usual placeholder syntax. -->
          <li>Hello <span>{{name}}</span>, age <span>{{age}}</span>!</li>
        </template>"""
    }
}

@Retain
@ExportForCppRuntime("_newCollectionsParticle")
fun constructCollectionsParticle(): WasmAddress = CollectionsParticle().toWasmAddress()
