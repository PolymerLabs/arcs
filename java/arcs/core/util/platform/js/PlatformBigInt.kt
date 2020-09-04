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
import kotlin.js.JsName
import kotlin.js.js

@JsName("BigInt")
external class JsBigInt(value: dynamic) {
}

@JsName("Number")
external class JsNumber(value: dynamic) {
}

fun JsBigInt.toNumber() = JsNumber(this) as Double
fun JsBigInt.toInt() = this.toNumber().toInt()

fun jsbi(v: dynamic) = JsBigInt(v)

class PlatformBigInt(val jsBigInt: JsBigInt) {
    constructor(bigInt: String) : this(JsBigInt(bigInt))

    fun toByte() = jsBigInt.toInt().toByte()

    fun toChar() = jsBigInt.toInt().toChar()

    fun toDouble() = jsBigInt.toNumber()

    fun toFloat() = jsBigInt.toNumber().toFloat()

    fun toInt() = jsBigInt.toInt()

    fun toLong(): Long {
        val upper = this.div(TWO_POW_64).toInt().toLong()
        val lower = this.and(TWO_POW_64.sub(ONE)).toInt().toLong()
        return upper.toLong().shl(32).or(lower)
    }

    fun toShort() = jsBigInt.toInt().toShort()

    fun add(other: PlatformBigInt) = PlatformBigInt(jsbi(js("this.jsBigInt + other.jsBigInt")))
    fun sub(other: PlatformBigInt) = PlatformBigInt(jsbi(js("this.jsBigInt - other.jsBigInt")))
    fun mul(other: PlatformBigInt) = PlatformBigInt(jsbi(js("this.jsBigInt * other.jsBigInt")))
    fun div(other: PlatformBigInt) = PlatformBigInt(jsbi(js("this.jsBigInt / other.jsBigInt")))
    fun and(other: PlatformBigInt) = PlatformBigInt(jsbi(js("this.jsBigInt & other.jsBigInt")))
    fun or(other: PlatformBigInt) = PlatformBigInt(jsbi(js("this.jsBigInt | other.jsBigInt")))

    operator fun compareTo(other: PlatformBigInt): Int = this.sub(other).toInt()

    companion object {
        private val TWO_POW_64 = PlatformBigInt(jsbi(js("BigInt(1) << BigInt(64)")))
        private val ONE = PlatformBigInt(jsbi(js("BigInt(1)")))
    }
}
