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

class UnicodeTest : Particle() {
    private val sng = Singleton(this, "sng") { UnicodeTest_Sng() }
    private val col = Collection(this, "col") { UnicodeTest_Col() }
    private val res = Collection(this, "res") { UnicodeTest_Res() }

    override fun onHandleUpdate(handle: Handle) {
        val out = UnicodeTest_Res(pass = "", src = "")
        out.src = "åŗċş 🌈"
        out.pass = if (handle.name == "sng") {
            ((handle as Singleton<*>).get() as UnicodeTest_Sng).pass
        } else {
            ((handle as Collection<*>).iterator().next() as UnicodeTest_Col).pass
        }
        res.store(out)
    }
}
