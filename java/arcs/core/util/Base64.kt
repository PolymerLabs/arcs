/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.util

/** Extension function to decode a base64 string into a [ByteArray]. */
fun String.toBase64Bytes(): ByteArray = Base64.decode(this)

fun ByteArray.toBase64String(): String = Base64.encode(this)

/** Implementations of Base-64 encoding/decoding. */
object Base64 {
    private const val CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    private val VALUES = CHARS.withIndex().associate { it.value to it.index }
    private val REGEXP = "[$CHARS]*={0,2}".toRegex()

    /** Encodes the given [ByteArray] to a Base64 [String]. */
    fun encode(byteArray: ByteArray): String = with(StringBuilder()) {
        var lastValue: BitVector.Window? = null

        // Take runs of 6 bits from the byte array, and get their character from CHARS.
        BitVector(byteArray)
            .asSequenceOfInts(6)
            .forEach {
                lastValue = it
                append(CHARS[it.value])
            }

        // Add padding.
        repeat(lastValue?.paddingBits?.div(2) ?: 0) { append("=") }

        return@with toString()
    }

    /**
     * Decodes the given Base64-encoded [String] into a [ByteArray].
     *
     * If you're confident that your string is well-formed, pass [true] for [gottaGoFast] to skip a
     * regular expression check..
     */
    fun decode(string: String, gottaGoFast: Boolean = false): ByteArray {
        if (string.isEmpty()) return ByteArray(0)

        require(string.length % 4 == 0) { "Base64 string length must be a multiple of 4" }
        require(gottaGoFast || REGEXP.matches(string)) { "Input string is invalid Base64 string" }

        val expectedByteCount = string.length / 4 * 3

        // Based on padding, we need to adjust our expectations.
        val (byteCount, lastCharShift) = when {
            // Two padding characters means two fewer bytes in the result.
            string[string.lastIndex] == '=' && string[string.lastIndex - 1] == '=' ->
                (expectedByteCount - 2) to 4
            // One padding character means one fewer byte in the result.
            string[string.lastIndex] == '=' ->
                (expectedByteCount - 1) to 2
            else -> expectedByteCount to 0
        }

        val vector = BitVector(byteCount * 8)
        val values = string.mapNotNull { VALUES[it] }.toIntArray()

        values.forEachIndexed { i, value ->
            val shift = if (i == values.size - 1) lastCharShift else 0
            vector.appendBits((value ushr shift).toByte(), 0..(5 - shift))
        }
        return vector.bytes
    }
}
