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

package sdk.kotlin.javatests.arcs

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton

class HandleSyncUpdateTest : Particle() {
    private val sng = Singleton(this, "sng") { HandleSyncUpdateTest_Sng() }
    private val col = Collection(this, "col") { HandleSyncUpdateTest_Col() }
    private val res = Collection(this, "res") { HandleSyncUpdateTest_Res() }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        res.store(HandleSyncUpdateTest_Res(txt = "sync:${handle.name}:$allSynced", num = 0.0))
    }

    override fun onHandleUpdate(handle: Handle) {
        val out = HandleSyncUpdateTest_Res()
        out.txt = "update:${handle.name}"
        if (handle.name == "sng") {
            val data = (handle as Singleton<*>).get() as HandleSyncUpdateTest_Sng
            out.num = data.num
        } else if (handle.name == "col") {
            val data = (handle as Collection<*>).iterator().next() as HandleSyncUpdateTest_Col
            out.num = data.num
        } else {
            out.txt = "unexpected handle name: ${handle.name}"
        }
        res.store(out)
    }
}
