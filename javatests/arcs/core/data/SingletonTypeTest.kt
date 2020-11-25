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

import arcs.core.crdt.CrdtSingleton
import arcs.core.type.Tag
import arcs.core.type.TypeFactory
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SingletonTypeTest {
  @Test
  fun toLiteral() {
    val literal = PRODUCT_SINGLETON_TYPE.toLiteral()
    assertThat(literal.tag).isEqualTo(Tag.Singleton)
    assertThat(literal.data.tag).isEqualTo(Tag.Entity)
    assertThat(literal.data.data).isEqualTo(PRODUCT_SCHEMA.toLiteral())
  }

  @Test
  fun createCrdtModel() {
    assertThat(PRODUCT_SINGLETON_TYPE.createCrdtModel()).isInstanceOf(CrdtSingleton::class.java)
  }

  @Test
  fun entitySchema() {
    assertThat(PRODUCT_SINGLETON_TYPE.entitySchema).isEqualTo(PRODUCT_SCHEMA)
  }

  @Test
  fun init_typeRegistry() {
    val literal = PRODUCT_SINGLETON_TYPE.toLiteral()
    assertThat(TypeFactory.getType(literal)).isEqualTo(PRODUCT_SINGLETON_TYPE)
  }

  companion object {
    private val PRODUCT_SCHEMA = Schema(
      setOf(SchemaName("Product"), SchemaName("Thing")),
      SchemaFields(
        mapOf("name" to FieldType.Text),
        mapOf("ratings" to FieldType.Number)
      ),
      "fake-hash"
    )
    private val PRODUCT_SINGLETON_TYPE = SingletonType(EntityType(PRODUCT_SCHEMA))
  }
}
