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

import arcs.core.type.Tag
import arcs.core.type.Type.ToStringOptions
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [TypeVariable]. */
@RunWith(JUnit4::class)
class TypeVariableTest {
  @Test
  fun tagIsTypeVariable() {
    assertThat(TypeVariable("a").tag).isEqualTo(Tag.TypeVariable)
  }

  @Test
  fun toStringContainsNameAndTag() {
    val typeVarA = TypeVariable("A")
    val typeVarBaz = TypeVariable("Baz")
    assertThat(typeVarA.toStringWithOptions(ToStringOptions())).isEqualTo("~A")
    assertThat(typeVarBaz.toStringWithOptions(ToStringOptions())).isEqualTo("~Baz")
  }
}
