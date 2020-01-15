// ktlint-disable filename
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

@file:Suppress("PackageName", "TopLevelName")

package arcs.sdk

actual object Utils {
    actual fun log(msg: String): Unit = throw NotImplementedError()

    actual fun abort(): Unit = throw NotImplementedError()

    actual fun assert(message: String, cond: Boolean): Unit = throw NotImplementedError()

    actual fun toUtf8String(bytes: ByteArray): String = bytes.toString(Charsets.UTF_8)

    actual fun toUtf8ByteArray(str: String): ByteArray = str.toByteArray(Charsets.UTF_8)
}
