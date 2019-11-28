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

import arcs.*
import arcs.wasm.toAddress
import kotlin.native.internal.ExportForCppRuntime
import kotlin.native.Retain

class AutoRenderTest : Particle() {
    private val data = Singleton { AutoRenderTest_Data() }

    init {
        registerHandle("data", data)
    }

    override fun init() = renderOutput()
    override fun onHandleUpdate(handle: Handle) = renderOutput()
    override fun onHandleSync(handle: Handle, allSynced: Boolean) = renderOutput()
    override fun getTemplate(slotName: String): String = data.get()?.txt ?: "empty"
}

@Retain
@ExportForCppRuntime("_newAutoRenderTest")
fun constructAutoRenderTest() = AutoRenderTest().toAddress()
