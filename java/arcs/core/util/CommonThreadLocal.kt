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
 * This package provides a class CommonThreadLocal<T> with get(): T and set(value: T) methods
 * depending on JS, JVM, and Native platforms.
 */
class CommonThreadLocal<T>() {
    private val platformThreadLocal = ThreadLocal<T>()
    fun get() = platformThreadLocal.get()
    fun set(value: T) = platformThreadLocal.set(value)
}
