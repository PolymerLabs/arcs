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

package arcs.sdk.wasm

import arcs.sdk.Utils

/** Converts a [ByteArray] into a [String]. */
fun ByteArray.toUtf8String(): String = Utils.toUtf8String(this)

/** Converts a [String] into a [ByteArray]. */
fun String.toUtf8ByteArray(): ByteArray = Utils.toUtf8ByteArray(this)

/** Wraps a ByteArray whose final byte is set to 0. */
inline class NullTermByteArray(val bytes: ByteArray)

/** Decodes bytes passed from JS into Kotlin types. */
class StringDecoder(private var bytes: ByteArray) {

    fun done(): Boolean = bytes.isEmpty() || bytes[0] == 0.toByte()

    fun upTo(sep: Char): ByteArray {
        val ind = bytes.indexOf(sep.toByte())
        if (ind == -1) {
            error("Packaged entity decoding failed in upTo()\n")
        }
        val chunk = bytes.sliceArray(0..(ind - 1))
        bytes = bytes.sliceArray((ind + 1)..(bytes.size - 1))
        return chunk
    }

    fun getInt(sep: Char): Int = upTo(sep).toUtf8String().toInt()

    fun chomp(len: Int): ByteArray {
        // TODO: detect overrun
        val chunk = bytes.sliceArray(0..(len - 1))
        bytes = bytes.sliceArray(len..(bytes.size - 1))
        return chunk
    }

    fun validate(token: String) {
        if (chomp(token.length).toUtf8String() != token) {
            throw IllegalArgumentException("Packaged entity decoding failed in validate()")
        }
    }

    fun decodeText(): String = chomp(getInt(':')).toUtf8String()

    fun decodeNum(): Double = upTo(':').toUtf8String().toDouble()

    fun decodeBool(): Boolean = chomp(1).toUtf8String() == "1"

    fun decodeNotImplemented(): Any = throw NotImplementedError("No JS to Kotlin encoding exists for this type")

    companion object {
        fun decodeDictionary(bytes: ByteArray): Map<String, String> {
            val decoder = StringDecoder(bytes)
            val dict = mutableMapOf<String, String>()

            var num = decoder.getInt(':')
            while (num-- > 0) {
                val klen = decoder.getInt(':')
                val key = decoder.chomp(klen).toUtf8String()

                val vlen = decoder.getInt(':')
                val value = decoder.chomp(vlen).toUtf8String()

                dict[key] = value
            }

            return dict
        }
    }
}

/** Encodes data to be passed over the WASM bridge to JS. */
class StringEncoder(
    private val buffers: MutableList<ByteArray> = mutableListOf(),
    private var size: Int = 0
) {
    fun encodeDictionary(dict: Map<String, Any?>): StringEncoder {
        addStr("${dict.size}:")
        for ((key, value) in dict) {
            addBytes("", key.toUtf8ByteArray())
            encodeValue(value)
        }
        return this
    }

    fun encodeList(list: List<Any>): StringEncoder {
        addStr("${list.size}:")
        list.forEach { encodeValue(it) }
        return this
    }

    fun encodeValue(value: Any?) {
        when (value) {
            is String -> addBytes("T", value.toUtf8ByteArray())
            is Boolean -> addStr("B${if (value) 1 else 0}")
            is Double -> addStr("N$value:")
            is Map<*, *> -> {
                @Suppress("UNCHECKED_CAST")
                val se = StringEncoder().encodeDictionary(value as Map<String, Any?>)
                addBytes("D", se.toByteArray())
            }
            is List<*> -> {
                @Suppress("UNCHECKED_CAST")
                val se = StringEncoder().encodeList(value as List<Any>)
                addBytes("A", se.toByteArray())
            }
            else -> throw IllegalArgumentException("Unknown value.")
        }
    }

    fun encode(prefix: String, str: String) {
        addBytes(prefix, str.toUtf8ByteArray())
        addStr("|")
    }

    fun encode(prefix: String, num: Double) {
        addStr("$prefix$num:|")
    }

    fun encode(prefix: String, flag: Boolean) {
        addStr("$prefix${if (flag) "1" else "0"}|")
    }

    private fun addStr(str: String) {
        str.toUtf8ByteArray().also {
            buffers.add(it)
            size += it.size
        }
    }

    private fun addBytes(prefix: String, bytes: ByteArray) {
        addStr("$prefix${bytes.size}:")
        buffers.add(bytes)
        size += bytes.size
    }

    fun toByteArray(): ByteArray {
        // TODO: accept an optional ByteArray argument to allow callers to reuse
        // existing instances.
        val res = ByteArray(size)
        populate(res)
        return res
    }

    fun toNullTermByteArray(): NullTermByteArray {
        // TODO: accept an optional NullTermByteArray argument to allow callers
        // to reuse existing instances.
        val res = ByteArray(size + 1)
        var pos = populate(res)
        res[pos] = 0.toByte()
        return NullTermByteArray(res)
    }

    private fun populate(res: ByteArray): Int {
        var pos = 0
        buffers.forEach {
            it.copyInto(res, pos)
            pos += it.size
        }
        return pos
    }
}
