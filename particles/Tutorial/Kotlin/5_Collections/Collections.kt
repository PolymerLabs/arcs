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

    override fun populateModel(slotName: String, model: Map<String, String>): Map<String, Any> {
        
        var peopleStr = ""
        //var peopleArr = arrayOfNulls<Map<String, String>>(people.size + 1)
            if (!people.isEmpty()) {
            var i = 0
            people.forEach { people ->
                peopleStr += "${(++i)}. $people.name $people.age | \n"
                //peopleArr[i] = mapOf("name" to people.name, "age" to people.age.toString())
            }
        }
        val size = people.size
        log("people: $peopleStr")
        // val generatedStringArray = Array(10) { i -> "Number of index: $i"  }
        val peopleArr = Array(people.size) { i -> mapOf("name" to people.name, "age" to "10") }
        return model + mapOf(
            "people" to mapOf(
                "\$template" to "person",
                "models" to peopleArr
                // arrayOf(
                //     mapOf("name" to "sarah", "age" to "1"),
                //     mapOf("name" to "jaye", "age" to "5")
                // )
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
