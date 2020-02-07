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

/**
 * Sample Kotlin-WASM Particle to use a JSON store.
 */
class JsonStore : AbstractJsonStore() {
    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        val person = handles.inputData.fetch() ?: JsonStore_InputData()

        return model + mapOf(
            "name" to person.name,
            "age" to person.age
        )
    }

    override fun getTemplate(slotName: String): String {
        return "<b>Hello, <span>{{name}}</span>, aged <span>{{age}}</span>!</b>"
    }
}
