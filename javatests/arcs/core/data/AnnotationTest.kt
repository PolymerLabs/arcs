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

package arcs.core.data

import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Annotation]. */
@RunWith(JUnit4::class)
class AnnotationTest {
    @Test
    fun from_string_no_param() {
        val annotations = Annotation.fromString("@test")
        assertThat(annotations.size).isEqualTo(1)
        assertThat(annotations[0].name).isEqualTo("test")
        assertThat(annotations[0].params.size).isEqualTo(0)
    }

    @Test
    fun from_string_with_single_param() {
        val annotations = Annotation.fromString("@test(hello: 'world world!')")
        assertThat(annotations.size).isEqualTo(1)
        assertThat(annotations[0].name).isEqualTo("test")
        assertThat(annotations[0].params.size).isEqualTo(1)
        assertThat(annotations[0].params.get("hello")).isEqualTo(AnnotationParam.Str("world world!"))
    }

    @Test
    fun from_string_with_multiple_params() {
        val annotations = Annotation.fromString("@test(hello: 'world', foo: 5, bar: true)")
        assertThat(annotations.size).isEqualTo(1)
        assertThat(annotations[0].name).isEqualTo("test")
        assertThat(annotations[0].params.size).isEqualTo(3)
        assertThat(annotations[0].params.get("hello")).isEqualTo(AnnotationParam.Str("world"))
        assertThat(annotations[0].params.get("foo")).isEqualTo(AnnotationParam.Num(5))
        assertThat(annotations[0].params.get("bar")).isEqualTo(AnnotationParam.Bool(true))
    }
    @Test
    fun from_string_multiple_annotations() {
        val annotations = Annotation.fromString(
            "@foo(bar: 'baz') @qux @test(hello: 'world', five: 5, yes: true)"
        )
        assertThat(annotations.size).isEqualTo(3)
        assertThat(annotations[0].name).isEqualTo("foo")
        assertThat(annotations[0].params.get("bar")?.strValue()).isEqualTo("baz")
        assertThat(annotations[0].params.size).isEqualTo(1)
        assertThat(annotations[1].name).isEqualTo("qux")
        assertThat(annotations[1].params.size).isEqualTo(0)
        assertThat(annotations[2].name).isEqualTo("test")
        assertThat(annotations[2].params.size).isEqualTo(3)
        assertThat(annotations[2].params.get("hello")?.strValue()).isEqualTo("world")
        assertThat(annotations[2].params.get("five")?.numValue()).isEqualTo(5)
        assertThat(annotations[2].params.get("yes")?.boolValue()).isEqualTo(true)
    }
}
