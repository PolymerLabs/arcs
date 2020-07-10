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
    var x = 0

    init {
        handles.inHandle.onUpdate {
            x = 1
        }
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "case1" -> {
                if (handles.ioHandle.fetch() == null) {
                    handles.errors.store(
                        SingletonApiTest_Errors(msg = "case1: populated handle should not be null")
                    )
                }
                if (x == 1) {
                    handles.errors.store(
                      SingletonApiTest_Errors(msg = "case1: handle.onUpdate should not have been called yet.")
                    )
                }
                handles.outHandle.clear()
                handles.ioHandle.clear()
                if (handles.ioHandle.fetch() != null) {
                    handles.errors.store(
                        SingletonApiTest_Errors(msg = "case1: cleared handle should be null")
                    )
                }
            }
            "case2" -> {
                if (x == 0) {
                    handles.errors.store(
                      SingletonApiTest_Errors(msg = "case1: handle.onUpdate should have been called.")
                    )
                }
                val input = handles.inHandle.fetch()
                val d = SingletonApiTest_OutHandle(
                    num = input?.num ?: 0.0,
                    txt = input?.txt ?: ""
                )
                handles.outHandle.store(d.copy(num = d.num.times(2)))
            }
            "case3" -> {
                val input = handles.inHandle.fetch()
                val d = SingletonApiTest_IoHandle(
                    num = input?.num ?: 0.0,
                    txt = input?.txt ?: ""
                )
                handles.ioHandle.store(d.copy(d.num.times(3)))
            }
            "case4" -> {
                if (handles.ioHandle.fetch() != null) {
                    handles.errors.store(
                        SingletonApiTest_Errors(msg = "case4: cleared handle should be null")
                    )
                }
                handles.outHandle.store(SingletonApiTest_OutHandle(txt = "out", num = 0.0))
                handles.ioHandle.store(SingletonApiTest_IoHandle(txt = "io", num = 0.0))
                if (handles.ioHandle.fetch() == null) {
                    handles.errors.store(
                        SingletonApiTest_Errors(msg = "case4: populated handle should not be null")
                    )
                }
            }
        }
    }
}
