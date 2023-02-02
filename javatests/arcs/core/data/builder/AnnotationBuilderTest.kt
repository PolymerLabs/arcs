/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.data.builder

import arcs.core.data.AnnotationParam
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class AnnotationBuilderTest {
  @Test
  fun annotation_emptyBlock() {
    val actual = annotation("ttl")

    assertThat(actual.name).isEqualTo("ttl")
    assertThat(actual.params).isEmpty()
  }

  @Test
  fun annotation_withParamBlock() {
    val actual = annotation("ttl") {
      param("stringParam", "My String Value")
      param("intParam", 42)
      param("boolParam", true)
    }

    assertThat(actual.name).isEqualTo("ttl")
    assertThat(actual.params).hasSize(3)
    assertThat(actual.params).containsExactly(
      "stringParam", AnnotationParam.Str("My String Value"),
      "intParam", AnnotationParam.Num(42),
      "boolParam", AnnotationParam.Bool(true)
    )
  }

  @Test
  fun javaStyle() {
    val actual = AnnotationBuilder("ttl")
      .param("stringParam", "My String Value")
      .param("intParam", 42)
      .param("boolParam", true)
      .build()

    assertThat(actual.name).isEqualTo("ttl")
    assertThat(actual.params).hasSize(3)
    assertThat(actual.params).containsExactly(
      "stringParam", AnnotationParam.Str("My String Value"),
      "intParam", AnnotationParam.Num(42),
      "boolParam", AnnotationParam.Bool(true)
    )
  }
}
