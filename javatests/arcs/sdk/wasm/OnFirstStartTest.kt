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

class OnFirstStartTest : AbstractOnFirstStartTest() {
    var firstStartCalled = false

    override fun onFirstStart() {
        handles.fooHandle.store(OnFirstStartTest_FooHandle("Created!"))
        firstStartCalled = true
    }

    override fun onHandleSync(handle: WasmHandle, allSynced: Boolean) {
        if (!firstStartCalled) {
            handles.fooHandle.fetch()
            handles.fooHandle.store(OnFirstStartTest_FooHandle("Not created!"))
        }
    }
}
