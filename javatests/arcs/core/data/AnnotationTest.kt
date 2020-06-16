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

@RunWith(JUnit4::class)
class AnnotationTest {
    @Test
    fun fromString_noParam() {
        val annotation = Annotation.fromString("@test")
        val expected = Annotation(
            name = "test",
            params = emptyMap()
        )
        assertThat(annotation).isEqualTo(expected)
    }

    @Test
    fun fromString_singleParam() {
        val annotation = Annotation.fromString("@test(hello: 'world world!')")
        val expected = Annotation(
            name = "test",
            params = mapOf(
                "hello" to AnnotationParam.Str("world world!")
            )
        )
        assertThat(annotation).isEqualTo(expected)
    }

    @Test
    fun fromString_multipleParams() {
        val annotation = Annotation.fromString("@test(hello: 'world', foo: 5, bar: true)")
        val expected = Annotation(
            name = "test",
            params = mapOf(
                "hello" to AnnotationParam.Str("world"),
                "foo" to AnnotationParam.Num(5),
                "bar" to AnnotationParam.Bool(true)
            )
        )
        assertThat(annotation).isEqualTo(expected)
        // assertThat(annotation.params["hello"].value).isEqualTo("world")
        // assertThat(annotation.params["foo"].value).isEqualTo(5)
        // assertThat(annotation.params["bar"].value).isEqualTo(true)
    }
}
