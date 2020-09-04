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

import java.math.BigInteger

class PlatformBigInt() {
    constructor(bigInt: String) {}

    fun toByte(): Byte = TODO()

    fun toChar(): Char = TODO()

    fun toDouble(): Double = TODO()

    fun toFloat(): Float = TODO()

    fun toInt(): Int = TODO()

    fun toLong(): Long = TODO()

    fun toShort(): Short = TODO()

    fun add(other: PlatformBigInt): PlatformBigInt = TODO()
    fun sub(other: PlatformBigInt): PlatformBigInt = TODO()
    fun mul(other: PlatformBigInt): PlatformBigInt = TODO()
    fun div(other: PlatformBigInt): PlatformBigInt = TODO()
    fun and(other: PlatformBigInt): PlatformBigInt = TODO()
    fun or(other: PlatformBigInt): PlatformBigInt = TODO()

    operator fun compareTo(other: PlatformBigInt): Int = TODO()
}
