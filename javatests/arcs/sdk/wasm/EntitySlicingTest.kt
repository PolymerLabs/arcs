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

import arcs.sdk.Handle

typealias Res = EntitySlicingTest_Res

class EntitySlicingTest : AbstractEntitySlicingTest() {
    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (!allSynced) return;

        s1.fetch()?.let { res.store(Res("s1:${it.num.toInt()}")) }
        s2.fetch()?.let { res.store(Res("s2:${it.num.toInt()},${it.txt}")) }
        s3.fetch()?.let { res.store(Res("s3:${it.num.toInt()},${it.txt},${it.flg}")) }

        for (e in c1) {
            res.store(Res("c1:${e.num.toInt()}"))
        }
        for (e in c2) {
            res.store(Res("c2:${e.num.toInt()},${e.txt}"))
        }
        for (e in c3) {
            res.store(Res("c3:${e.num.toInt()},${e.txt},${e.flg}"))
        }
    }
}
