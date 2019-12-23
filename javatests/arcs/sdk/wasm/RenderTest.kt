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

package arcs.sdk.wasm

import arcs.sdk.Handle
import arcs.sdk.Particle
import arcs.sdk.Singleton

class RenderTest : Particle() {
    private val flags = Singleton(this, "flags") { RenderTest_Flags() }
    private var shouldTemplate: Boolean = true
    private var shouldPopulate: Boolean = true

    override fun init() {
        renderOutput()
    }

    override fun getTemplate(slotName: String): String? = if (shouldTemplate) "abc" else null

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any>? =
        if (shouldPopulate) mapOf("foo" to "bar") else null

    override fun onHandleUpdate(handle: Handle) {
        flags.get()?.let {
            shouldTemplate = it.template
            shouldPopulate = it.model
        }
        renderOutput()
    }
}
