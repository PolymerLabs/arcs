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

class OnCreateTest : AbstractOnCreateTest() {
    var created = false

    override fun onCreate() {
        handles.outHandle.store(OnCreateTest_FooHandle("Created!"))
        created = true
    }

    override fun onHandleSync(handle: WasmHandle, allSynced: Boolean) {
        if (!created) {
            handles.fooHandle.fetch()
            handles.fooHandle.store(OnCreateTest_FooHandle("Not Created!"))
        }
    }
}
