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

package arcs.jvm.util.testutil

import arcs.core.util.Time
import kotlinx.atomicfu.AtomicLong
import kotlinx.atomicfu.atomic

class FakeTime(initial: Long = 999_999L) : Time() {
  private val _millis: AtomicLong = atomic(initial)

  var millis: Long
    set(value) { _millis.value = value }
    get() = _millis.value

  override val nanoTime: Long
    get() {
      millis += autoincrement
      return millis * 1_000_000
    }

  override val currentTimeMillis: Long
    get() {
      millis += autoincrement
      return millis
    }

  var autoincrement = 0
}
