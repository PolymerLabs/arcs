/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.tutorials

import arcs.sdk.Handle

/**
 * Sample WASM Particle.
 */
class DisplayGreeting : AbstractDisplayGreeting() {

    var name = "Human"

    init{
        handles.person.onUpdate{ p ->
            name = p?.name ?: name
            this.renderOutput()
        }
    }

    override fun getTemplate(slotName: String) = "Hello, <span>{{name}}</span>!"

    override fun populateModel(slotName: String, model: Map<String, Any>) = mapOf("name" to name)
}
