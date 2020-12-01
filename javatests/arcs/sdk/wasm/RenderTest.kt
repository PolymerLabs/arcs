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

package arcs.sdk.wasm

class RenderTest : AbstractRenderTest() {
  private var shouldTemplate: Boolean = true
  private var shouldPopulate: Boolean = true

  override fun init() {
    renderOutput()
  }

  override fun getTemplate(slotName: String): String? = if (shouldTemplate) "abc" else null

  override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any>? =
    if (shouldPopulate) mapOf("foo" to "bar") else null

  override fun onHandleUpdate(handle: WasmHandle) {
    handles.flags.fetch()?.let {
      shouldTemplate = it.template
      shouldPopulate = it.model
    }
    renderOutput()
  }
}
