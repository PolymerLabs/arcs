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
 * Multiplatform BigInteger for Java/JS/Native. Delegates to [java.math.BigInteger] on the JVM,
 * native ES6 "BigInt" on JS, and a hand-rolled shim on native platforms.
 */
class BigInt private constructor(
    val platformBigInt: PlatformBigInt
) : Number(), Comparable<BigInt> {
    /** Translates the decimal String representation of a BigInteger into a BigInteger. */
    constructor(bigInt: String) : this(PlatformBigInt(bigInt))

    override fun toByte(): Byte = platformBigInt.toByte()

    override fun toChar(): Char = platformBigInt.toChar()

    override fun toDouble(): Double = platformBigInt.toDouble()

    override fun toFloat(): Float = platformBigInt.toFloat()

    override fun toInt(): Int = platformBigInt.toInt()

    override fun toLong(): Long = platformBigInt.toLong()

    override fun toShort(): Short = platformBigInt.toShort()

    /** Returns a BigInteger whose value is (this + other). */
    fun add(other: BigInt) = BigInt(platformBigInt.add(other.platformBigInt))

    /** Returns a BigInteger whose value is (this - other). */
    fun subtract(other: BigInt) = BigInt(platformBigInt.subtract(other.platformBigInt))

    /** Returns a BigInteger whose value is (this * other). */
    fun multiply(other: BigInt) = BigInt(platformBigInt.multiply(other.platformBigInt))

    /** Returns a BigInteger whose value is (this / other). */
    fun divide(other: BigInt) = BigInt(platformBigInt.divide(other.platformBigInt))

    override operator fun compareTo(other: BigInt): Int
        = platformBigInt.compareTo(other.platformBigInt)

    override fun toString(): String = platformBigInt.toString()

    companion object {
        /** The BigInteger constant one. */
        val ONE = BigInt("1")

        /** The BigInteger constant ten. */
        val TEN = BigInt("10")

        /** The BigInteger constant zero. */
        val ZERO = BigInt("0")

        /** Returns a BigInt by parsing its string representation. */
        fun valueOf(str: String) = BigInt(str)

        /** Returns a BigInteger whose value is equal to that of the specified long. */
        fun valueOf(long: Long) = BigInt(long.toString())
    }
}

/** Extension function to convert [String] to [BigInt]. */
fun String.toBigInt() = BigInt.valueOf(this)

/** Extension function to convert an arbitrary [Number] into a [BigInt]. */
fun Number.toBigInt(): BigInt = when (this) {
    is BigInt -> this
    else -> BigInt.valueOf(this.toLong())
}
