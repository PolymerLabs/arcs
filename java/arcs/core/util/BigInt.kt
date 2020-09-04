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
 * Multiplatform BigInteger.
 */
class BigInt(val platformBigInt: PlatformBigInt) : Number(), Comparable<BigInt> {
    constructor(bigInt: String) : this(PlatformBigInt(bigInt))

    override fun toByte(): Byte = platformBigInt.toByte()

    override fun toChar(): Char = platformBigInt.toChar()

    override fun toDouble(): Double = platformBigInt.toDouble()

    override fun toFloat(): Float = platformBigInt.toFloat()

    override fun toInt(): Int = platformBigInt.toInt()

    override fun toLong(): Long = platformBigInt.toLong()

    override fun toShort(): Short = platformBigInt.toShort()

    fun add(other: BigInt) = BigInt(platformBigInt.add(other.platformBigInt))
    fun subtract(other: BigInt) = BigInt(platformBigInt.sub(other.platformBigInt))
    fun multiply(other: BigInt) = BigInt(platformBigInt.mul(other.platformBigInt))
    fun divide(other: BigInt) = BigInt(platformBigInt.div(other.platformBigInt))

    override operator fun compareTo(other: BigInt): Int
        = platformBigInt.compareTo(other.platformBigInt)

    companion object {
        fun valueOf(str: String) = BigInt(str)
        fun valueOf(long: Long) = BigInt(long.toString())

    }
}

fun String.toBigInt() = BigInt.valueOf(this)
fun Number.toBigInt(): BigInt = when (this) {
    is BigInt -> this
    else -> BigInt.valueOf(this.toLong())
}
