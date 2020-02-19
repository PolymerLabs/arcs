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

class AutoRenderTest : AbstractAutoRenderTest() {
    override fun init() = renderOutput()
    override fun onHandleUpdate(handle: WasmHandle) = renderOutput()
    override fun onHandleSync(handle: WasmHandle, allSynced: Boolean) = renderOutput()
    override fun getTemplate(slotName: String): String = handles.data.fetch()?.txt ?: ""
}
