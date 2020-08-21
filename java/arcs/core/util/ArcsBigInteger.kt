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
 * Provides a platform-independent version of [ArcsBigInteger]
 * based on java.math.BigInteger.
 */
class ArcsBigInteger(public val value: ByteArray) : Number() {
    constructor(value: String) : this(PlatformBigIntegerProvider.fromString(value).value)

    fun add(other: ArcsBigInteger): ArcsBigInteger =
        PlatformBigIntegerProvider.add(this, other)
    fun multiply(other: ArcsBigInteger): ArcsBigInteger =
        PlatformBigIntegerProvider.multiply(this, other)
    fun subtract(other: ArcsBigInteger): ArcsBigInteger =
        PlatformBigIntegerProvider.subtract(this, other)
    fun divide(other: ArcsBigInteger): ArcsBigInteger =
        PlatformBigIntegerProvider.divide(this, other)
    fun compareTo(other: ArcsBigInteger): Int =
        PlatformBigIntegerProvider.compareTo(this, other)

    override fun toString(): String = PlatformBigIntegerProvider.toString(this)
    override fun equals(other: Any?): Boolean = PlatformBigIntegerProvider.equals(this, other)

    companion object {
        fun valueOf(value: Long): ArcsBigInteger =
            PlatformBigIntegerProvider.valueOf(value)
        fun fromString(value: String): ArcsBigInteger =
            PlatformBigIntegerProvider.fromString(value)

        val ZERO: ArcsBigInteger
            get() = PlatformBigIntegerProvider.ZERO
        val ONE: ArcsBigInteger
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

fun String.toArcsBigInteger(): ArcsBigInteger = ArcsBigInteger.fromString(this)

fun Number.toArcsBigInteger(): ArcsBigInteger = when (this) {
    is ArcsBigInteger -> this
    else -> ArcsBigInteger.valueOf(this.toLong())
}
