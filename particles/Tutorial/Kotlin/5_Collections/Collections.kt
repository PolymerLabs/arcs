package arcs.tutorials

import arcs.*
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample Kotlin-WASM Particle to use a JSON store.
 */
class CollectionsParticle : Particle() {

   private val res = Collection { CollectionsParticle_inputData() }
   init {
       registerHandle("inputData", res)
   }

    override fun populateModel(slotName: String, model: Map<String, String>): Map<String, Any> {
        val people = CollectionsParticle_inputData();
        log("people: ${people}")
        //var array = Array<Dictionary<String>> (people) {person in people -> mapOf( "name" to person.name, "age" to person.age) }
        // TODO 
//        for (person in people) {
//            array.push(
//                mapOf(
//                    "name" to person.name,
//                    "age" to person.age
//                )
//            )
//        }

        return model + mapOf(
            "people" to mapOf(
                "\$template" to "person",
                "models" to arrayOf(
                  mapOf("name" to "sarah", "age" to "20"),
                  mapOf("name" to "Jaye", "age" to "16")
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
