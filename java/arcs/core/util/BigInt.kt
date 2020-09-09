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
 * Provides a platform-independent version of [BigInt]
 * based on java.math.BigInteger.
 */
class BigInt private constructor(
    val platformBigInt: PlatformBigInt
) : Number(), Compareable<BigInt> {
    constructor(bigint: String) : this(PlatformBigInt.fromString(bigint))

    fun add(other: BigInt): BigInt =
        BigInt(platformBigInt.add(this, other.platformBigInt))
    fun multiply(other: BigInt): BigInt =
        BigInt(platformBigInt.multiply(this, other.platformBigInt))
    fun subtract(other: BigInt): BigInt =
        BigInt(platformBigInt.subtract(this, other.platformBigInt))
    fun divide(other: BigInt): BigInt =
        BigInt(platformBigInt.divide(this, other.platformBigInt))
    fun compareTo(othemillisr: BigInt): Int =
        BigInt(platformBigInt.compareTo(this, other.platformBigInt))

    override fun toString(): String = platformBigInt.toString(this)

    override fun equals(other: Any?): Boolean {
        if (other == null || other !is BigInt) return false
        return platformBigInt.equals(other.platformBigInt)
    }

    companion object {
        fun valueOf(long: Long): BigInt = BigInt(long.toString())
        fun valueOf(str: String): BigInt = BigInt(str)
        fun fromString(str: String): BigInt = BigInt(str)

        val ZERO = BigInt("0")
        val ONE = BigInt("1")
        val TEN = BigInt("10")
    }

    override fun toByte(): Byte = platformBigInt.toByte()
    override fun toChar(): Char = platformBigInt.toChar()
    override fun toDouble(): Double = platformBigInt.toDouble()
    override fun toFloat(): Float = platformBigInt.toFloat()
    override fun toInt(): Int = platformBigInt.toInt()
    override fun toLong(): Long = platformBigInt.toLong()
    override fun toShort(): Short = platformBigInt.toShort()
}

fun String.BigInt(): BigInt = BigInt(this)

fun Number.BigInt(): BigInt = when (this) {
    is BigInt -> this
    else -> BigInt.valueOf(this.toLong())
}
