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

import arcs.sdk.Handle

/**
 * Sample WASM Particle.
 */
class DisplayGreeting : AbstractDisplayGreeting() {
    override fun getTemplate(slotName: String) = "Hello, <span>{{name}}</span>!"

    override fun onHandleUpdate(handle: Handle) {
        this.renderOutput()
    }

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        return model + mapOf(
            "name" to (person.fetch()?.name ?: "Human")
        )
    }
}
