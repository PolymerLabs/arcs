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

package arcs

/**
 * Utilities for ease-of-use
 *
 * Sugar to delegate function calls to methods on the current [RuntimeClient].
 */

fun log(msg: String) = RuntimeClient.log(msg)
fun abort() = RuntimeClient.abort()
fun assert(message: String, cond: Boolean) = RuntimeClient.assert(message, cond)


