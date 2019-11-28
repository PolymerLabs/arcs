/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package wasm.kotlin.javatests.arcs

import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.wasm.toAddress
import kotlin.native.internal.ExportForCppRuntime
import kotlin.native.Retain

class RenderTest : Particle() {
    private val flags = Singleton { RenderTest_Flags() }
    private var shouldTemplate: Boolean = true
    private var shouldPopulate: Boolean = true

    init {
        registerHandle("flags", flags)
    }

    override fun init() {
        renderOutput()
    }

    override fun getTemplate(slotName: String): String? = if (shouldTemplate) "abc" else null

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?>? =
        if (shouldPopulate) mapOf("foo" to "bar") else null

    override fun onHandleUpdate(handle: Handle) {
        flags.get()?.let {
            shouldTemplate = it.template ?: true
            shouldPopulate = it.model ?: true
        }
        renderOutput()
    }
}

@Retain
@ExportForCppRuntime("_newRenderTest")
fun constructRenderTest() = RenderTest().toAddress()
