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

import arcs.sdk.kotlin.Particle
import arcs.sdk.kotlin.Singleton

/**
 * Sample Kotlin-WASM Particle to use a JSON store.
 */
class JsonStore : Particle() {

    private val res = Singleton(this, "inputData") { JsonStore_InputData(
        name = "",
        age = 0.0
    ) }

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {
        val person = res.get() ?: JsonStore_InputData("", 0.0)

        return model + mapOf(
            "name" to person.name,
            "age" to person.age
        )
    }

    override fun getTemplate(slotName: String): String {
        return "<b>Hello, <span>{{name}}</span>, aged <span>{{age}}</span>!</b>"
    }
}
