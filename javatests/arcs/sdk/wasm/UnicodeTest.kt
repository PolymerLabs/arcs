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

class UnicodeTest : AbstractUnicodeTest() {
    override fun onHandleUpdate(handle: Handle) {
        val out = UnicodeTest_Res(pass = "", src = "åŗċş 🌈")
        val pass = if (handle.name == "sng") {
            ((handle as WasmSingletonImpl<*>).fetch() as UnicodeTest_Sng).pass
        } else {
            // TODO(cypher1): This is unsafe, there is no guarantee of ordering.
            ((handle as WasmCollectionImpl<*>).fetchAll().iterator().next() as UnicodeTest_Col).pass
        }
        handles.res.store(out.copy(pass = pass))
    }
}
