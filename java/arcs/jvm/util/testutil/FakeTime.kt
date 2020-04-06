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

class FakeTime(var millis: Long = 999_999) : Time() {
    override val nanoTime: Long
        get() = millis * 1_000_000

    override val currentTimeMillis: Long
        get() = millis
}
