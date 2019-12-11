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

import arcs.addressable.toAddress
import arcs.Particle
import arcs.Singleton
import kotlin.native.internal.ExportForCppRuntime
import kotlin.native.Retain

/**
 * Sample WASM Particle.
 */
class GetPersonParticle : Particle() {
    private val person = Singleton { GetPerson_Person() }

    override fun getTemplate(slotName: String) = """
        <input placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
        <div slotid="greetingSlot"></div>""".trimIndent()

    init {
        registerHandle("person", person)

        eventHandler("onNameInputChange") { eventData ->
            val p = person.get() ?: GetPerson_Person()
            p.name = eventData["value"] ?: "Human"
            person.set(p)
        }
    }
}

@Retain
@ExportForCppRuntime()
fun _newGetPerson() = GetPersonParticle().toAddress()
