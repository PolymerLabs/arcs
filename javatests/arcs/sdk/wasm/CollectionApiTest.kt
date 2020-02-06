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

class CollectionApiTest : AbstractCollectionApiTest() {
    private var stored = CollectionApiTest_OutHandle()

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "case1" -> {
                outHandle.clear()
                ioHandle.clear()
            }
            "case2" -> {
                stored = stored.copy(
                    flg = inHandle.isEmpty(),
                    num = inHandle.size.toDouble()
                )
                outHandle.store(stored)
            }
            "case3" -> {
                outHandle.remove(stored)
            }
            "case4" -> {
                val d1 = CollectionApiTest_OutHandle()
                val iter = inHandle.iterator()
                val flg = iter.hasNext()
                val i1 = iter.next()
                outHandle.store(d1.copy(
                    txt = "num: ${i1.num.toInt()}",
                    num = i1.num.let { it * 2 },
                    flg = flg
                ))

                outHandle.store(d1.copy(
                    txt = "eq",
                    flg = iter.hasNext()
                ))

                outHandle.store(d1.copy(
                    txt = "ne",
                    flg = !iter.hasNext()
                ))
            }
            "case5" -> {
                val extra = CollectionApiTest_IoHandle().copy(txt = "abc")


                ioHandle.store(extra)
                val d1 = CollectionApiTest_OutHandle(
                    num = ioHandle.size.toDouble(),
                    txt = "",
                    flg = ioHandle.isEmpty())
                outHandle.store(d1)

                ioHandle.remove(extra)
                val d2 = CollectionApiTest_OutHandle(
                    num = ioHandle.size.toDouble(),
                    txt = "",
                    flg = false
                )
                outHandle.store(d2)

                // Ranged iteration; order is not guaranteed so use 'num' to assign sorted array slots.
                val sorted = ioHandle.sortedBy { it.num.toInt() }
                sorted.forEach {
                    outHandle.store(CollectionApiTest_OutHandle(
                        num = it.num,
                        txt = it.txt,
                        flg = false
                    ))
                }

                ioHandle.clear()
                val d3 = CollectionApiTest_OutHandle(
                    num = ioHandle.size.toDouble(),
                    txt = "",
                    flg = ioHandle.isEmpty()
                )
                outHandle.store(d3)
            }
        }
    }
}
