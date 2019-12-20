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

import arcs.sdk.common.Particle
import arcs.sdk.common.Singleton

/**
 * Sample WASM Particle.
 */
class GetPerson : Particle() {
    private val person = Singleton(this, "person") { GetPerson_Person() }

    override fun getTemplate(slotName: String) = """
        <input placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
        <div slotid="greetingSlot"></div>""".trimIndent()

    init {
        eventHandler("onNameInputChange") { eventData ->
            val p = person.get() ?: GetPerson_Person("Human")
            p.name = eventData["value"] ?: "Human"
            person.set(p)
        }
    }
}
