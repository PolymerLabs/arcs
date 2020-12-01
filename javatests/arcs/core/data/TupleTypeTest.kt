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

@RunWith(JUnit4::class)
class TupleTypeTest {

  @Test
  fun tag_isTuple() {
    assertThat(TupleType().tag).isEqualTo(Tag.Tuple)
  }

  @Test
  fun toStringWithOptions_listsElementTypes() {
    val tupleType = TupleType(
      TypeVariable("a"),
      EntityType(PRODUCT_SCHEMA),
      ReferenceType(EntityType(PRODUCT_SCHEMA))
    )
    assertThat(tupleType.toStringWithOptions(ToStringOptions()))
      .isEqualTo("(~a, Product {}, &Product {})")
  }

  companion object {
    private val PRODUCT_SCHEMA = Schema(
      setOf(SchemaName("Product")),
      SchemaFields(mapOf(), mapOf()),
      "fake-hash"
    )
  }
}
