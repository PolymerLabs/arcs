package arcs.tutorials

import arcs.*
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample Kotlin-WASM Particle to use a JSON store.
 */
class CollectionsParticle : Particle() {
   private val people = Collection { CollectionsParticle_InputData() }

   init {
       registerHandle("inputData", people)
   }

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {
        val peopleList = mutableListOf<Map<String, String?>>()
        people.forEach { people -> peopleList.add(mapOf("name" to people.name, "age" to people.age.toString())) }

        return model + mapOf(
            "people" to mapOf(
                "\$template" to "person",
                "models" to peopleList
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
