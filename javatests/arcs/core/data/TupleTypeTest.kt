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
import arcs.core.type.TypeFactory
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
  fun copy() {
    assertThat(TUPLE_TYPE.copy(mutableMapOf())).isEqualTo(TUPLE_TYPE)
  }

  @Test
  fun copyWithResolutions() {
    val variableMap = mutableMapOf<Any, Any>()
    assertThat(TUPLE_TYPE.copyWithResolutions(variableMap)).isEqualTo(TUPLE_TYPE)
    assertThat(variableMap).hasSize(1)
  }

  @Test
  fun toLiteral() {
    val typeVar = TypeVariable("a")
    val refType = ReferenceType(EntityType(PRODUCT_SCHEMA))

    val literal = TupleType(typeVar, refType).toLiteral()

    assertThat(literal.tag).isEqualTo(Tag.Tuple)
    assertThat(literal.data).containsExactly(typeVar.toLiteral(), refType.toLiteral()).inOrder()
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

  @Test
  fun init_typeRegistry() {
    val literal = TUPLE_TYPE.toLiteral()
    assertThat(TypeFactory.getType(literal)).isEqualTo(TUPLE_TYPE)
  }

  companion object {
    private val PRODUCT_SCHEMA = Schema(
      setOf(SchemaName("Product")),
      SchemaFields(mapOf(), mapOf()),
      "fake-hash"
    )
    private val TUPLE_TYPE = TupleType(
      TypeVariable("a"),
      EntityType(PRODUCT_SCHEMA),
      ReferenceType(EntityType(PRODUCT_SCHEMA))
    )
  }
}
