/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.tutorials

import arcs.Collection
import arcs.Collections_InputData
import arcs.Particle

/**
 * Sample Kotlin-WASM Particle to use a JSON store.
 */
class Collections : Particle() {
    private val people = Collection(this, "inputData") { Collections_InputData() }

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {
        val peopleList = mutableListOf<Map<String, Comparable<*>?>>()
        people.forEach { people ->
            peopleList.add(mapOf("name" to people.name, "age" to people.age))
        }

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
