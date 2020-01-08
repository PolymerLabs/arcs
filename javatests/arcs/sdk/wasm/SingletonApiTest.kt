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

class SingletonApiTest : AbstractSingletonApiTest() {
    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "case1" -> {
                outHandle.clear()
                ioHandle.clear()
            }
            "case2" -> {
                val input = inHandle.get()
                val d = SingletonApiTest_OutHandle(
                    num = input?.num ?: 0.0,
                    txt = input?.txt ?: ""
                )
                d.num = d.num.times(2)
                outHandle.set(d)
            }
            "case3" -> {
                val input = inHandle.get()
                val d = SingletonApiTest_IoHandle(
                    num = input?.num ?: 0.0,
                    txt = input?.txt ?: ""
                )
                d.num = d.num.times(3)
                ioHandle.set(d)
            }
        }
    }
}
