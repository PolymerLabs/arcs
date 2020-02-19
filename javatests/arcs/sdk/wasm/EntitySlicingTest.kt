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

typealias Res = EntitySlicingTest_Res

class EntitySlicingTest : AbstractEntitySlicingTest() {
    override fun onHandleSync(handle: WasmHandle, allSynced: Boolean) {
        if (!allSynced) return;

        handles.s1.fetch()?.let { handles.res.store(Res("s1:${it.num.toInt()}")) }
        handles.s2.fetch()?.let { handles.res.store(Res("s2:${it.num.toInt()},${it.txt}")) }
        handles.s3.fetch()?.let { handles.res.store(Res("s3:${it.num.toInt()},${it.txt},${it.flg}")) }

        for (e in handles.c1.fetchAll()) {
            handles.res.store(Res("c1:${e.num.toInt()}"))
        }
        for (e in handles.c2.fetchAll()) {
            handles.res.store(Res("c2:${e.num.toInt()},${e.txt}"))
        }
        for (e in handles.c3.fetchAll()) {
            handles.res.store(Res("c3:${e.num.toInt()},${e.txt},${e.flg}"))
        }
    }
}
