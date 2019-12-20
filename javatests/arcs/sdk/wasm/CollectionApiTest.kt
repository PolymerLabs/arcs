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

import arcs.sdk.Collection
import arcs.sdk.Particle

class CollectionApiTest : Particle() {
    private val _in = Collection(this, "inHandle") { CollectionApiTest_InHandle() }
    private val out = Collection(this, "outHandle") { CollectionApiTest_OutHandle() }
    private val io = Collection(this, "ioHandle") { CollectionApiTest_IoHandle() }
    private val stored = CollectionApiTest_OutHandle()

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "case1" -> {
                out.clear()
                io.clear()
            }
            "case2" -> {
                stored.flg = _in.isEmpty()
                stored.num = _in.size.toDouble()
                out.store(stored)
            }
            "case3" -> {
                out.remove(stored)
            }
            "case4" -> {
                val d1 = CollectionApiTest_OutHandle()
                val iter = _in.iterator()
                d1.flg = iter.hasNext()
                val i1 = iter.next()
                d1.txt = "{${i1.internalId}}, num: ${i1.num.toInt()}"
                d1.num = i1.num.let { it * 2 }
                out.store(d1)

                val d2 = CollectionApiTest_OutHandle()
                d2.txt = "eq"
                d2.flg = iter.hasNext()
                out.store(d2)

                val d3 = CollectionApiTest_OutHandle()
                d3.txt = "ne"
                d3.flg = !iter.hasNext()
                out.store(d3)
            }
            "case5" -> {
                val extra = CollectionApiTest_IoHandle()

                extra.txt = "abc"
                io.store(extra)
                val d1 = CollectionApiTest_OutHandle(
                    num = io.size.toDouble(),
                    txt = "",
                    flg = io.isEmpty())
                out.store(d1)

                io.remove(extra)
                val d2 = CollectionApiTest_OutHandle(
                    num = io.size.toDouble(),
                    txt = "",
                    flg = false
                )
                out.store(d2)

                // Ranged iteration; order is not guaranteed so use 'num' to assign sorted array slots.
                val res = mutableListOf<String>()
                for (data in io) {
                    res.add("{${data.internalId}}, num: ${data.num.toInt()}")
                }

                res
                    .map { s: String ->
                        CollectionApiTest_OutHandle(
                            num = 0.0,
                            txt = s,
                            flg = false
                        )
                    }
                    .forEach { h: CollectionApiTest_OutHandle -> out.store(h) }

                io.clear()
                val d3 = CollectionApiTest_OutHandle(
                    num = io.size.toDouble(),
                    txt = "",
                    flg = io.isEmpty()
                )
                out.store(d3)
            }
        }
    }
}
