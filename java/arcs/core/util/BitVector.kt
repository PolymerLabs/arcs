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

/**
 * Implementation of a bit vector as an array of bytes. Supports iterating over arbitrarily-sized
 * windows (of length between 1 and 32).
 */
class BitVector(
    /** Backing data for the [BitVector]. */
    val bytes: ByteArray,
    /** Capacity of the [BitVector]. */
    val sizeBits: Int = bytes.size * 8,
    usedBits: Int = bytes.size * 8
) {
    /** Number of bits used by the [BitVector]. */
    var usedBits = usedBits
        private set

    init {
        /* ktlint-disable max-line-length */
        require(sizeBits in 0..(bytes.size * 8)) {
            "sizeBits must not be larger than the available space in the byte array and greater than 0"
        }
        require(usedBits in 0..(bytes.size * 8)) {
            "usedBits must not be larger than the available space in the byte array and greater than 0"
        }
        /* ktlint-enable max-line-length */
    }

    /** Creates an empty (all zeros, with [usedBits] = 0) [BitVector] of length [bitCount]. */
    constructor(bitCount: Int) : this(
        ByteArray(bitCount / 8 + if (bitCount % 8 > 0) 1 else 0),
        sizeBits = bitCount,
        usedBits = 0
    )

    /**
     * Adds the masked value of bits to the end of the [BitVector].
     *
     * @param bitRange range of bits to select from the [byte], where for each value `i` in the
     *   range: `byte\[i]` is the `i`th bit from the right. E.g. `appendBits(0b01110000, 4..6)`
     *   would select the 1s.
     */
    fun appendBits(byte: Byte, bitRange: IntRange = 0..7) {
        val numBits = bitRange.last - bitRange.first + 1

        require(
            bitRange.first >= 0 && bitRange.last <= 7
        ) { "bitRange must be a subrange of [0, 8)" }
        /* ktlint-disable max-line-length */
        require(usedBits + numBits <= sizeBits) {
            "Cannot insert $numBits bits. Capacity needs to be ${usedBits + numBits}. (it's $sizeBits)"
        }
        /* ktlint-enable max-line-length */

        val sizedMask = (FULL_MASK ushr (32 - numBits))

        // Shift the byte and mask it so we select only the values to inject.
        val bits = ((byte.toInt() and 0xFF) ushr bitRange.first) and sizedMask

        val currentByte = bytes[usedBits / 8].toInt() and 0xFF

        if (8 - usedBits % 8 >= numBits) {
            // Our bits to appendBits can fit within the current byte.
            val shiftAmount = 8 - usedBits % 8 - numBits
            bytes[usedBits / 8] = (currentByte or (bits shl shiftAmount)).toByte()
        } else {
            // Our bits need to span the current byte and the next byte.
            val nextByte = bytes[usedBits / 8 + 1].toInt() and 0xFF

            val firstByteBitCount = 8 - usedBits % 8
            val secondByteBitCount = numBits - firstByteBitCount

            val firstByteMask = (FULL_MASK ushr (32 - firstByteBitCount)) shl secondByteBitCount
            val secondByteMask = (FULL_MASK ushr (32 - secondByteBitCount))

            bytes[usedBits / 8] =
                (currentByte or ((bits and firstByteMask) shr secondByteBitCount)).toByte()
            bytes[usedBits / 8 + 1] =
                (nextByte or ((bits and secondByteMask) shl (8 - secondByteBitCount))).toByte()
        }

        usedBits += numBits
    }

    fun asSequenceOfInts(bitsPerValue: Int): Sequence<Window> {
        require(bitsPerValue in 1..32) {
            "Invalid `bitsPerValue`, must be between 1 and 32 (inclusive)."
        }

        return Sequence {
            var bitIndex = 0

            object : Iterator<Window> {
                override fun hasNext(): Boolean = bitIndex < usedBits

                override fun next(): Window {
                    val startPoint = bitIndex
                    var remainingBits = bitsPerValue
                    var windowValue = 0

                    while (remainingBits > 0 && bitIndex < usedBits) {
                        val currentByte = bytes[bitIndex / 8]
                        val bitsAchieved = minOf(8 - bitIndex % 8, remainingBits)

                        val bitMaskLeftShift = (8 - bitIndex % 8) - bitsAchieved
                        val bitMask = (FULL_MASK ushr 32 - bitsAchieved) shl bitMaskLeftShift
                        val ourBits = (currentByte.toInt() and 0xFF) and bitMask
                        val ourBitsShiftedRight = ourBits ushr bitMaskLeftShift
                        val offset = remainingBits - bitsAchieved
                        windowValue = windowValue or (ourBitsShiftedRight shl offset)

                        remainingBits -= bitsAchieved
                        bitIndex += bitsAchieved
                    }

                    return Window(windowValue, remainingBits, bitsPerValue, startPoint)
                }
            }
        }
    }

    /** Represents a window into a [BitVector]. */
    data class Window(
        /** Contains [size] bits in the least-significant position (shifted all the way to the right. */
        val value: Int,
        /**
         * Number of padding bits required to fill-out [size] bits when the [BitVector] wasn't a
         * multiple of [size].
         */
        val paddingBits: Int,
        /**
         * Number of bits requested from the [BitVector].
         *
         * **Note:** If this is the last window from a vector whose length is not a multiple of [size],
         * the number of bits in [value] is equal to `size - paddingBits`.
         */
        val size: Int,
        /** Location within the [BitVector] where the [value] can be found. */
        val position: Int
    )

    companion object {
        private const val FULL_MASK = -1 // Because 0xFFFFFFFF in kotlin is a Long.
    }
}
