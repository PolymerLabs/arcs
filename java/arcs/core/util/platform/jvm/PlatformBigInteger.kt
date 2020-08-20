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

import java.math.BigInteger as PlatformBigInteger

private typealias ArcsBI = arcs.core.util.ArcsBigInteger

fun ArcsBI.toNative(): PlatformBigInteger = PlatformBigInteger(this.value)
fun PlatformBigInteger.toArcs(): ArcsBI = ArcsBI(this.toByteArray())

object PlatformBigIntegerProvider {
    fun add(left: ArcsBI, right: ArcsBI): ArcsBI =
        left.toNative().add(right.toNative()).toArcs()
    fun multiply(left: ArcsBI, right: ArcsBI): ArcsBI =
        left.toNative().multiply(right.toNative()).toArcs()
    fun subtract(left: ArcsBI, right: ArcsBI): ArcsBI =
        left.toNative().subtract(right.toNative()).toArcs()
    fun divide(left: ArcsBI, right: ArcsBI): ArcsBI =
        left.toNative().divide(right.toNative()).toArcs()
    fun compareTo(left: ArcsBI, right: ArcsBI): Int =
        left.toNative().compareTo(right.toNative())
    fun valueOf(value: Long): ArcsBI = PlatformBigInteger.valueOf(value).toArcs()
    fun fromString(value: String): ArcsBI = PlatformBigInteger(value).toArcs()
    val ZERO: ArcsBI
        get() = PlatformBigInteger.ZERO.toArcs()
    val ONE: ArcsBI
        get() = PlatformBigInteger.ONE.toArcs()

    fun toByte(value: ArcsBI): Byte = value.toNative().toByte()
    fun toChar(value: ArcsBI): Char = value.toNative().toChar()
    fun toDouble(value: ArcsBI): Double = value.toNative().toDouble()
    fun toFloat(value: ArcsBI): Float = value.toNative().toFloat()
    fun toInt(value: ArcsBI): Int = value.toNative().toInt()
    fun toLong(value: ArcsBI): Long = value.toNative().toLong()
    fun toShort(value: ArcsBI): Short = value.toNative().toShort()
}
