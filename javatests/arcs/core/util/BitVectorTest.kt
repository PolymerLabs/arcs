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

import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [BitVector]. */
@RunWith(JUnit4::class)
class BitVectorTest {
    private val alternating = 0b1010101010101010101010101010101
    private val alternatingBytes = alternating.toByteArray()

    @Test
    fun singleBitValues() {
        BitVector(alternatingBytes)
            .asSequenceOfInts(1).forEachIndexed { index, window ->
                assertThat(window.value).isEqualTo(index % 2)
                assertWithMessage("No padding bits").that(window.paddingBits).isEqualTo(0)
            }
    }

    @Test
    fun twoBitValues() {
        BitVector(alternatingBytes)
            .asSequenceOfInts(2).forEach { window ->
                assertThat(window.value).isEqualTo(0b01)
                assertWithMessage("No padding bits").that(window.paddingBits).isEqualTo(0)
            }
    }

    @Test
    fun threeBitValues() {
        val options = intArrayOf(0b010, 0b101)
        BitVector(alternatingBytes)
            .asSequenceOfInts(3).forEachIndexed { index, window ->
                val expectedValue = options[index % 2]
                assertWithMessage(
                    "${window.value.toString(2)} should be ${expectedValue.toString(2)}"
                )
                    .that(window.value).isEqualTo(expectedValue)
                if (index == 32 / 3) {
                    assertWithMessage("Last should have 1 padding bit").that(window.paddingBits)
                        .isEqualTo(1)
                } else {
                    assertWithMessage("No padding bits").that(window.paddingBits).isEqualTo(0)
                }
            }
    }

    @Test
    fun sixBitValues() {
        val body = 0b010101
        val tail = 0b010000

        BitVector(alternatingBytes)
            .asSequenceOfInts(6).forEachIndexed { index, window ->
                if (index == 5) {
                    assertWithMessage("Tail should be 0b010000").that(window.value).isEqualTo(tail)
                    assertWithMessage("Should have four padding bits").that(window.paddingBits)
                        .isEqualTo(4)
                } else {
                    assertWithMessage("Body should be 0b010101").that(window.value).isEqualTo(body)
                    assertWithMessage("No padding bits").that(window.paddingBits).isEqualTo(0)
                }
            }
    }

    @Test
    fun thirtyTwoBitValues() {
        var calls = 0
        BitVector(alternatingBytes).asSequenceOfInts(32).forEach { window ->
            calls++
            assertThat(window.value).isEqualTo(alternating)
            assertThat(window.paddingBits).isEqualTo(0)
        }

        assertThat(calls).isEqualTo(1)
    }

    @Test
    fun appendBitsToEmpty() {
        var vector = BitVector(128)
        vector.appendBits(0b01110000, 4..6)

        assertThat(vector.usedBits).isEqualTo(3)
        assertThat(vector.bytes[0]).isEqualTo(0b11100000.toByte())

        // Test a bitvector of size smaller than a single byte.
        vector = BitVector(3)
        vector.appendBits(0b01010000, 4..6)

        assertThat(vector.usedBits).isEqualTo(3)
        assertThat(vector.bytes[0]).isEqualTo(0b10100000.toByte())

        vector = BitVector(8)
        vector.appendBits(0b10101010)

        assertThat(vector.usedBits).isEqualTo(8)
        assertThat(vector.bytes[0]).isEqualTo(0b10101010.toByte())
    }

    @Test
    fun append_fitsWithinCurrentByte() {
        var vector = BitVector(8)
        vector.appendBits(0b01, 0..1)

        // Now append 3 more bits, after the first two.
        vector.appendBits(0b101, 0..2)
        assertThat(vector.usedBits).isEqualTo(5)
        assertThat(vector.bytes[0]).isEqualTo(0b01101000.toByte())

        // Try the case where the added bytes fill up the remainder of the current byte.
        vector = BitVector(16)
        vector.appendBits(0b010, 0..2)
        vector.appendBits(0b11111, 0..4)

        assertThat(vector.usedBits).isEqualTo(8)
        assertThat(vector.bytes[0]).isEqualTo(0b01011111.toByte())
    }

    @Test
    fun append_spansTwoBytes() {
        val vector = BitVector(11)
        vector.appendBits(0b010, 0..2)

        vector.appendBits(0b11111111)
        assertThat(vector.usedBits).isEqualTo(11)
        assertThat(vector.bytes[0]).isEqualTo(0b01011111.toByte())
        assertThat(vector.bytes[1]).isEqualTo(0b11100000.toByte())
    }

    @Test(expected = IllegalArgumentException::class)
    fun appendFromEmpty_throwsWhenInputDoesntFit() {
        val vector = BitVector(3)

        // Should throw
        vector.appendBits(0b11111, 0..4)
    }

    @Test(expected = IllegalArgumentException::class)
    fun appendFromNotEmpty_throwsWhenInputDoesntFit() {
        val vector = BitVector(8)
        vector.appendBits(0b1111, 0..3)

        // Should throw
        vector.appendBits(0b11111111)
    }

    /** Convenience function because Kotlin doesn't let you declare unsigned Bytes as literals. */
    fun BitVector.appendBits(byte: Int, bitRange: IntRange = 0..7) =
        appendBits(byte.toByte(), bitRange)
}
