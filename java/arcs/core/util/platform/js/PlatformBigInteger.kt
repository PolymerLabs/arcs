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

/** Provides a platform-dependent version of [ArcsBigInteger]. */
private typealias ArcsBI = arcs.core.util.ArcsBigInteger

// Placeholder for platform implementation.
class PlatformBigInteger {
}

fun ArcsBI.toNative(): PlatformBigInteger = TODO("Add support for ArcsBigInteger in Kotlin JS")
fun PlatformBigInteger.toArcs(): ArcsBI = TODO("Add support for ArcsBigInteger in Kotlin JS")

object PlatformBigIntegerProvider {
    fun add(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin JS")
    fun multiply(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin JS")
    fun subtract(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin JS")
    fun divide(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for ArcsBigInteger in Kotlin JS")
    fun compareTo(left: ArcsBI, right: ArcsBI): Int =
        TODO("Add support for ArcsBigInteger in Kotlin JS")
    fun valueOf(value: Long): ArcsBI = TODO("Add support for ArcsBigInteger in Kotlin JS")
    fun fromString(value: String): ArcsBI = TODO("Add support for ArcsBigInteger in Kotlin JS")
    val ZERO: ArcsBI
        get() = TODO("Add support for ArcsBigInteger in Kotlin JS")
    val ONE: ArcsBI
        get() = TODO("Add support for ArcsBigInteger in Kotlin JS")

    inline fun toByte(value: ArcsBI): Byte = TODO("Add support for ArcsBigInteger in Kotlin JS")
    inline fun toChar(value: ArcsBI): Char = TODO("Add support for ArcsBigInteger in Kotlin JS")
    inline fun toDouble(value: ArcsBI): Double = TODO("Add support for ArcsBigInteger in Kotlin JS")
    inline fun toFloat(value: ArcsBI): Float = TODO("Add support for ArcsBigInteger in Kotlin JS")
    inline fun toInt(value: ArcsBI): Int = TODO("Add support for ArcsBigInteger in Kotlin JS")
    inline fun toLong(value: ArcsBI): Long = TODO("Add support for ArcsBigInteger in Kotlin JS")
    inline fun toShort(value: ArcsBI): Short = TODO("Add support for ArcsBigInteger in Kotlin JS")
}
