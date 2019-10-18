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

package arcs.crdt.entity

import arcs.util.toBase64String
import com.google.common.truth.Truth.assertThat
import org.junit.BeforeClass
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [FieldValue], [FieldValueInterpreter], and [PrimitiveInterpreters]. */
@RunWith(JUnit4::class)
class FieldValueInterpreterTest {
  @Test
  fun numbersAreSupported() {
    with((42.0 as Number).toFieldValue()) {
      assertThat(id).isEqualTo("Number::${42.0.hashCode()}")
      assertThat(serializedValue).isEqualTo("42.0")
    }
    with("42.0".toFieldValue<Number>("blah")) {
      assertThat(getValue<Number>()).isEqualTo(42)
    }
  }

  @Test
  fun numbersAreSupported_intsSerializeToDoubles() {
    with((1337 as Number).toFieldValue()) {
      assertThat(serializedValue).isEqualTo("1337.0")
    }
  }

  @Test
  fun booleansAreSupported_true() {
    with(true.toFieldValue()) {
      assertThat(id).isEqualTo("Boolean::${true.hashCode()}")
      assertThat(serializedValue).isEqualTo("true")
    }
    with("true".toFieldValue<Boolean>("blah")) {
      assertThat(getValue<Boolean>()).isTrue()
    }
  }

  @Test
  fun booleansAreSupported_false() {
    with(false.toFieldValue()) {
      assertThat(id).isEqualTo("Boolean::${false.hashCode()}")
      assertThat(serializedValue).isEqualTo("false")
    }
    with("false".toFieldValue<Boolean>("blah")) {
      assertThat(getValue<Boolean>()).isFalse()
    }
  }

  @Test
  fun textIsSupported() {
    with("this is a test".toFieldValue()) {
      assertThat(id).isEqualTo("Text::${"this is a test".hashCode()}")
      assertThat(serializedValue).isEqualTo("\"this is a test\"")
    }
    with("\"this is a test\"".toFieldValue<Text>("blah")) {
      assertThat(getValue<Text>()).isEqualTo("this is a test")
    }
  }

  @Test
  fun textIsSupported_emptyString() {
    with("".toFieldValue()) {
      assertThat(id).isEqualTo("Text::${"".hashCode()}")
      assertThat(serializedValue).isEqualTo("\"\"")
    }
    with("\"\"".toFieldValue<Text>("blah")) {
      assertThat(getValue<Text>()).isEqualTo("")
    }
  }

  @Test
  fun urlIsSupported() {
    with(Url("http://google.com").toFieldValue()) {
      assertThat(id).isEqualTo("URL::${Url("http://google.com").hashCode()}")
      assertThat(serializedValue).isEqualTo("\"http://google.com\"")
    }
    with("\"http://google.com\"".toFieldValue<Url>("blah")) {
      assertThat(getValue<Url>()).isEqualTo(Url("http://google.com"))
    }
  }

  @Test
  fun instantIsSupported() {
    with(System.currentTimeMillis().toFieldValue()) {
      assertThat(id).isEqualTo("Instant::${getValue<Instant>().hashCode()}")
      assertThat(serializedValue).isEqualTo("${getValue<Instant>()}")
    }
    val time = System.currentTimeMillis()
    with(time.toString().toFieldValue<Instant>("blah")) {
      assertThat(getValue<Instant>()).isEqualTo(time)
    }
  }

  @Test
  fun byteArrayIsSupported() {
    val myData = "this is not a test"
    val bytes = myData.toByteArray()

    with(bytes.toFieldValue()) {
      assertThat(id).isEqualTo("Bytes::${bytes.contentHashCode()}")
      assertThat(serializedValue).isEqualTo(bytes.toBase64String())
    }
    with(bytes.toBase64String().toFieldValue<Bytes>("blah")) {
      assertThat(getValue<Bytes>().asList()).containsExactlyElementsIn(bytes.asList())
    }
  }

  companion object {
    @BeforeClass
    @JvmStatic
    fun registerInterpreters() {
      FieldValueInterpreter.registerPrimitives()
    }
  }
}
