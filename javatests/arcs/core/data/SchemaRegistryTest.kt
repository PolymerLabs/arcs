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
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class SchemaRegistryTest {
  @Before
  fun setUp() {
    SchemaRegistry.clearForTest()
  }

  @After
  fun tearDown() {
    SchemaRegistry.clearForTest()
  }

  @Test
  fun getSchema_unregisteredSchema_throwsException() {
    assertFailsWith<NoSuchElementException> { SchemaRegistry.getSchema(PRODUCT_SCHEMA.hash) }
  }

  @Test
  fun getSchema_succses() {
    SchemaRegistry.register(PRODUCT_SCHEMA)
    assertThat(SchemaRegistry.getSchema(PRODUCT_SCHEMA.hash)).isEqualTo(PRODUCT_SCHEMA)
    assertFailsWith<NoSuchElementException> { SchemaRegistry.getSchema("other-schema-hash") }
  }

  @Test
  fun getSchema_deregisterSchema_throwsException() {
    SchemaRegistry.register(PRODUCT_SCHEMA)
    SchemaRegistry.clearForTest()
    assertFailsWith<NoSuchElementException> { SchemaRegistry.getSchema(PRODUCT_SCHEMA.hash) }
  }

  @Test
  fun getSchema_overridesRegistration() {
    SchemaRegistry.register(PRODUCT_SCHEMA)
    assertThat(SchemaRegistry.getSchema(PRODUCT_SCHEMA.hash)).isEqualTo(PRODUCT_SCHEMA)
    SchemaRegistry.register(OTHER_PRODUCT_SCHEMA)
    assertThat(SchemaRegistry.getSchema(PRODUCT_SCHEMA.hash)).isEqualTo(OTHER_PRODUCT_SCHEMA)
  }

  companion object {
    private val productSchemaHash = "product-hash"

    private val PRODUCT_SCHEMA = Schema(
      setOf(SchemaName("Product"), SchemaName("Thing")),
      SchemaFields(
        mapOf("name" to FieldType.Text),
        mapOf("ratings" to FieldType.Number)
      ),
      productSchemaHash
    )

    private val OTHER_PRODUCT_SCHEMA = Schema(
      setOf(SchemaName("Product"), SchemaName("Other")),
      SchemaFields(emptyMap(), emptyMap()),
      productSchemaHash
    )
  }
}
