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
 * Provides a platform-independent version of [BigInteger]
 * based on java.math.BigInteger.
 */
class BigInteger(val value: ByteArray): Number() {
    constructor(value: String): this(PlatformBigInteger.fromString(value).value)

    fun add(other: BigInteger): BigInteger = PlatformBigIntegerProvider.add(this, other)
    fun multiply(other: BigInteger): BigInteger = PlatformBigIntegerProvider.multiply(this, other)
    fun subtract(other: BigInteger): BigInteger = PlatformBigIntegerProvider.subtract(this, other)
    fun divide(other: BigInteger): BigInteger = PlatformBigIntegerProvider.divide(this, other)
    fun compareTo(other: BigInteger): Int = PlatformBigIntegerProvider.compareTo(this, other)

    companion object PlatformBigInteger {
        fun valueOf(value: Long): BigInteger =
            PlatformBigIntegerProvider.valueOf(value)
        fun fromString(value: String): BigInteger =
            PlatformBigIntegerProvider.fromString(value)

        val ZERO: BigInteger
            get() = PlatformBigIntegerProvider.ZERO
        val ONE: BigInteger
            get() = PlatformBigIntegerProvider.ONE
    }

    override fun toByte(): Byte = PlatformBigIntegerProvider.toByte(this)
    override fun toChar(): Char = PlatformBigIntegerProvider.toChar(this)
    override fun toDouble(): Double = PlatformBigIntegerProvider.toDouble(this)
    override fun toFloat(): Float = PlatformBigIntegerProvider.toFloat(this)
    override fun toInt(): Int = PlatformBigIntegerProvider.toInt(this)
    override fun toLong(): Long = PlatformBigIntegerProvider.toLong(this)
    override fun toShort(): Short = PlatformBigIntegerProvider.toShort(this)
}
