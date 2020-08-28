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

/** Provides a platform-dependent version of [BigInteger]. */
private typealias ArcsBI = arcs.core.util.ArcsBigInteger

// Placeholder for platform implementation.
class PlatformBigInteger {
    override fun toString(): String = TODO("Add support for ArcsBigInteger in Kotlin Native")
}

fun ArcsBI.toNative(): PlatformBigInteger = TODO("Add support for ArcsBigInteger in Kotlin Native")
fun PlatformBigInteger.toArcs(): ArcsBI = TODO("Add support for ArcsBigInteger in Kotlin Native")

object PlatformBigIntegerProvider {
    @Suppress("UNUSED_PARAMETER")
    fun add(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun multiply(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun subtract(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun divide(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun compareTo(left: ArcsBI, right: ArcsBI): Int =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun valueOf(value: Long): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun fromString(value: String): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun toString(value: ArcsBI): String = value.toNative().toString()
    fun equals(left: ArcsBI, right: Any?): Boolean {
        if (right == null || right !is ArcsBI) return false
        return left.toNative().equals(right.toNative())
    }
    val ZERO: ArcsBI
        get() = TODO("Add support for ArcsBigInteger in Kotlin Native")
    val ONE: ArcsBI
        get() = TODO("Add support for ArcsBigInteger in Kotlin Native")

    @Suppress("UNUSED_PARAMETER")
    fun toByte(value: ArcsBI): Byte =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun toChar(value: ArcsBI): Char =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun toDouble(value: ArcsBI): Double =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun toFloat(value: ArcsBI): Float =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun toInt(value: ArcsBI): Int =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun toLong(value: ArcsBI): Long =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
    @Suppress("UNUSED_PARAMETER")
    fun toShort(value: ArcsBI): Short =
        TODO("Add support for ArcsBigInteger in Kotlin Native")
}
