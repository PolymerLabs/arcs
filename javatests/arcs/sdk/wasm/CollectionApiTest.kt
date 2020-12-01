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

class CollectionApiTest : AbstractCollectionApiTest() {
  private var stored = CollectionApiTest_OutHandle()
  var x = 0.0

  init {
    handles.ioHandle.onUpdate { x++ }
  }

  override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
    when (eventName) {
      "case1" -> {
        handles.outHandle.clear()
        handles.ioHandle.clear()
      }
      "case2" -> {
        stored = stored.copy(
          flg = handles.inHandle.isEmpty(),
          num = handles.inHandle.size.toDouble()
        )
        handles.outHandle.store(stored)
        handles.ioHandle.store(stored)
      }
      "case3" -> {
        handles.outHandle.remove(stored)
        handles.ioHandle.remove(stored)
      }
      "case4" -> {
        val d1 = CollectionApiTest_OutHandle()
        val iter = handles.inHandle.fetchAll().iterator()
        val flg = iter.hasNext()
        val i1 = iter.next()
        if (x == 3.0) {
          handles.outHandle.store(
            d1.copy(
              txt = "num: ${i1.num.toInt()}",
              num = i1.num * 2.0,
              flg = flg
            )
          )
        } else {
          handles.outHandle.store(
            d1.copy(
              txt = "handle.onUpdate() called is not working.",
              num = x,
              flg = flg
            )
          )
        }

        handles.outHandle.store(
          d1.copy(
            txt = "eq",
            flg = iter.hasNext()
          )
        )

        handles.outHandle.store(
          d1.copy(
            txt = "ne",
            flg = !iter.hasNext()
          )
        )
      }
      "case5" -> {
        val extra = CollectionApiTest_IoHandle(txt = "abc")

        handles.ioHandle.store(extra)
        val d1 = CollectionApiTest_OutHandle(
          num = handles.ioHandle.size.toDouble(),
          txt = "",
          flg = handles.ioHandle.isEmpty()
        )
        handles.outHandle.store(d1)

        handles.ioHandle.remove(extra)
        val d2 = CollectionApiTest_OutHandle(
          num = handles.ioHandle.size.toDouble(),
          txt = "",
          flg = false
        )
        handles.outHandle.store(d2)

        // Ranged iteration; order is not guaranteed so use 'num' to assign sorted array slots.
        val sorted = handles.ioHandle.fetchAll().sortedBy { it.num.toInt() }
        sorted.forEach {
          handles.outHandle.store(
            CollectionApiTest_OutHandle(
              num = it.num,
              txt = it.txt,
              flg = false
            )
          )
        }

        handles.ioHandle.clear()
        val d3 = CollectionApiTest_OutHandle(
          num = handles.ioHandle.size.toDouble(),
          txt = "",
          flg = handles.ioHandle.isEmpty()
        )
        handles.outHandle.store(d3)
      }
    }
  }
}
