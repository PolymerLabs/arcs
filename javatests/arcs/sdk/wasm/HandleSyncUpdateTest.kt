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

class HandleSyncUpdateTest : AbstractHandleSyncUpdateTest() {
    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        res.store(HandleSyncUpdateTest_Res(txt = "sync:${handle.name}:$allSynced", num = 0.0))
        if (allSynced) {
            val ptr = HandleSyncUpdateTest_Res()
            ptr.txt = if (sng.fetch() != null) "sng:populated" else "sng:null"
            res.store(ptr)
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        val out = HandleSyncUpdateTest_Res()
        out.txt = "update:${handle.name}"
        if (handle.name == "sng") {
            out.num = sng.fetch()?.num ?: -1.0
        } else if (handle.name == "col") {
            out.num = if (col.size > 0) col.iterator().next().num else -1.0
        } else {
            out.txt = "unexpected handle name: ${handle.name}"
        }
        res.store(out)
    }
}
