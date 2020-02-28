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
    var s = "Not created!"

    override fun onCreate() {
        s = "Created!"
        handles.outHandle.store(OnCreateTest_OutHandle("koalas"))
    }

    override fun onHandleSync(handle: WasmHandle, allSynced: Boolean) {
        handles.fooHandle.fetch()
        handles.fooHandle.store(OnCreateTest_FooHandle(s))
    }
}
