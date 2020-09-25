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

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [StringDecoder]. */
@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@RunWith(JUnit4::class)
class StringDecoderTest {

  @Test
  fun encodeDictionary() {
    val Dict = mapOf("name" to "Jill", "age" to "70.0")
    val encodedDict = "2:4:name4:Jill3:age4:70.0"
    val decodedDict = StringDecoder.decodeDictionary(encodedDict.toUtf8ByteArray())
    assertThat(decodedDict).isEqualTo(Dict)
  }
}
