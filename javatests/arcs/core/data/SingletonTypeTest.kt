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
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SingletonTypeTest {
  @Test
  fun createCrdtModel() {
    assertThat(PRODUCT_SINGLETON_TYPE.createCrdtModel()).isInstanceOf(CrdtSingleton::class.java)
  }

  @Test
  fun entitySchema() {
    assertThat(PRODUCT_SINGLETON_TYPE.entitySchema).isEqualTo(PRODUCT_SCHEMA)
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
