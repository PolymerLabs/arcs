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

package arcs.sdk

/**
 * Utilities for ease-of-use. Implemented for each platform.
 */
interface UtilsInterface {
    fun log(msg: String)

    fun abort()

    fun assert(message: String, cond: Boolean)

    fun toUtf8String(bytes: ByteArray): String

    fun toUtf8ByteArray(str: String): ByteArray
}
