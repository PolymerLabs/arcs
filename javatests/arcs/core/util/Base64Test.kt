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
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Base64]. */
@Suppress("SpellCheckingInspection")
@RunWith(JUnit4::class)
class Base64Test {
    @Test
    fun encodesAsciiString() {
        assertThat(Base64.encode("Test".toByteArray(Charsets.US_ASCII)))
            .isEqualTo("VGVzdA==")

        assertThat(Base64.encode("Jason".toByteArray(Charsets.US_ASCII)))
            .isEqualTo("SmFzb24=")

        assertThat(Base64.encode("This is a longer test".toByteArray(Charsets.US_ASCII)))
            .isEqualTo("VGhpcyBpcyBhIGxvbmdlciB0ZXN0")
    }

    @Test
    fun encodesUtf8String() {
        assertThat(Base64.encode("😀".toByteArray(Charsets.UTF_8)))
            .isEqualTo("8J+YgA==")

        assertThat(Base64.encode("你好，世界".toByteArray(Charsets.UTF_8)))
            .isEqualTo("5L2g5aW977yM5LiW55WM")
    }

    @Test
    fun decodesAsciiString() {
        assertThat(Base64.decode("VGVzdA==").toString(Charsets.US_ASCII))
            .isEqualTo("Test")

        assertThat(Base64.decode("SmFzb24=").toString(Charsets.US_ASCII))
            .isEqualTo("Jason")

        assertThat(Base64.decode("VGhpcyBpcyBhIGxvbmdlciB0ZXN0").toString(Charsets.US_ASCII))
            .isEqualTo("This is a longer test")
    }

    @Test
    fun decodesUtf8String() {
        assertThat(Base64.decode("8J+YgA==").toString(Charsets.UTF_8))
            .isEqualTo("😀")

        assertThat(Base64.decode("5L2g5aW977yM5LiW55WM").toString(Charsets.UTF_8))
            .isEqualTo("你好，世界")
    }
}
