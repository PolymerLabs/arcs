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

object PlatformBigIntegerProvider {
    fun add(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for BigInteger in Kotlin JS")
    fun multiply(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for BigInteger in Kotlin JS")
    fun subtract(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for BigInteger in Kotlin JS")
    fun divide(left: ArcsBI, right: ArcsBI): ArcsBI =
        TODO("Add support for BigInteger in Kotlin JS")
    fun compareTo(left: ArcsBI, right: ArcsBI): Int =
        TODO("Add support for BigInteger in Kotlin JS")
    fun valueOf(value: Long): ArcsBI = TODO("Add support for BigInteger in Kotlin JS")
    fun fromString(value: String): ArcsBI = TODO("Add support for BigInteger in Kotlin JS")
    val ZERO: ArcsBI
        get() = TODO("Add support for BigInteger in Kotlin JS")
    val ONE: ArcsBI
        get() = TODO("Add support for BigInteger in Kotlin JS")

    fun toByte(value: ArcsBI): Byte = TODO("Add support for BigInteger in Kotlin JS")
    fun toChar(value: ArcsBI): Char = TODO("Add support for BigInteger in Kotlin JS")
    fun toDouble(value: ArcsBI): Double = TODO("Add support for BigInteger in Kotlin JS")
    fun toFloat(value: ArcsBI): Float = TODO("Add support for BigInteger in Kotlin JS")
    fun toInt(value: ArcsBI): Int = TODO("Add support for BigInteger in Kotlin JS")
    fun toLong(value: ArcsBI): Long = TODO("Add support for BigInteger in Kotlin JS")
    fun toShort(value: ArcsBI): Short = TODO("Add support for BigInteger in Kotlin JS")
}
