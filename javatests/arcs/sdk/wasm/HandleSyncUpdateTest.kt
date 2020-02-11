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
        handles.res.store(HandleSyncUpdateTest_Res(txt = "sync:${handle.name}:$allSynced", num = 0.0))
        if (allSynced) {
            var ptr = HandleSyncUpdateTest_Res()
            handles.res.store(ptr.copy(txt = if (handles.sng.fetch() != null) "sng:populated" else "sng:null"))
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        var txt = "update:${handle.name}"
        var num = 0.0
        if (handle.name == "sng") {
            num = handles.sng.fetch()?.num ?: -1.0
        } else if (handle.name == "col") {
            // TODO(cypher1): This is unsafe, there is no guarantee of ordering.
            num = if (handles.col.size > 0) handles.col.fetchAll().iterator().next().num else -1.0
        } else {
            txt = "unexpected handle name: ${handle.name}"
        }
        handles.res.store(HandleSyncUpdateTest_Res(
            txt = txt,
            num = num
        ))
    }
}
