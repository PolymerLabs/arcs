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
    var x = 0;
    init{
        inHandle.onUpdate{
            x = 1;
        }
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "case1" -> {
                if (ioHandle.get() == null) {
                    errors.store(
                        SingletonApiTest_Errors(msg = "case1: populated handle should not be null")
                    )
                }
                if(x == 1) {
                    errors.store(
                      SingletonApiTest_Errors(msg = "case1: handle.onUpdate should not have been called yet.")
                    )
                }
                outHandle.clear()
                ioHandle.clear()
                if (ioHandle.get() != null) {
                    errors.store(
                        SingletonApiTest_Errors(msg = "case1: cleared handle should be null")
                    )
                }

            }
            "case2" -> {
                if(x == 0) {
                    errors.store(
                      SingletonApiTest_Errors(msg = "case1: handle.onUpdate should have been called.")
                    )
                }
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
            "case4" -> {
                if (ioHandle.get() != null) {
                    errors.store(
                        SingletonApiTest_Errors(msg = "case4: cleared handle should be null")
                    )
                }
                outHandle.set(SingletonApiTest_OutHandle(txt = "out", num = 0.0))
                ioHandle.set(SingletonApiTest_IoHandle(txt = "io", num = 0.0))
                if (ioHandle.get() == null) {
                    errors.store(
                        SingletonApiTest_Errors(msg = "case4: populated handle should not be null")
                    )
                }
            }
        }
    }
}
