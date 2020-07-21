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

package arcs.core.util

/**
 * Single-threaded implementation for native. Kotlin Native does support threads,
 * and WASM will eventually support pthreads, so this may change.
 */
class ThreadLocal<T> {
    var value: T? = null
    fun get(): T? = value
    fun set(value: T) = value
}
