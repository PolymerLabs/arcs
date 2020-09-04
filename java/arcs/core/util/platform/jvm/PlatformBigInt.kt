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

class PlatformBigInt(val bigInt: BigInteger) {
    constructor(bigInt: String) : this(bigInt.toBigInteger())

    fun toByte() = bigInt.toInt().toByte()

    fun toChar() = bigInt.toInt().toChar()

    fun toDouble() = bigInt.toDouble()

    fun toFloat() = bigInt.toFloat()

    fun toInt() = bigInt.toInt()

    fun toLong() = bigInt.toLong()

    fun toShort() = bigInt.toInt().toShort()

    fun add(other: PlatformBigInt) = PlatformBigInt(bigInt.add(other.bigInt))
    fun sub(other: PlatformBigInt) = PlatformBigInt(bigInt.subtract(other.bigInt))
    fun mul(other: PlatformBigInt) = PlatformBigInt(bigInt.multiply(other.bigInt))
    fun div(other: PlatformBigInt) = PlatformBigInt(bigInt.divide(other.bigInt))
    fun and(other: PlatformBigInt) = PlatformBigInt(bigInt.and(other.bigInt))
    fun or(other: PlatformBigInt) = PlatformBigInt(bigInt.or(other.bigInt))

    operator fun compareTo(other: PlatformBigInt): Int = bigInt.compareTo(other.bigInt)
}
