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

package arcs.core.util

/** Splits an [Int] into its four component bytes. */
fun Int.toByteArray(): ByteArray = byteArrayOf(
    ((this ushr 24) and 0xFF).toByte(),
    ((this ushr 16) and 0xFF).toByte(),
    ((this ushr 8) and 0xFF).toByte(),
    (this and 0xFF).toByte()
)
