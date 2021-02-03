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

import arcs.core.data.FieldType
import arcs.core.data.SchemaName
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SchemaBuilderTest {
  @Test
  fun minimal() {
    val schema = schema("abc1234")

    assertThat(schema.hash).isEqualTo("abc1234")
    assertThat(schema.names).isEmpty()
    assertThat(schema.fields.singletons).isEmpty()
    assertThat(schema.fields.collections).isEmpty()
  }

  @Test
  fun changingHash() {
    val schema = schema("abc1234") {
      hash = "1234abc"
      hash = "defg"
    }

    assertThat(schema.hash).isEqualTo("defg")
    assertThat(schema.names).isEmpty()
    assertThat(schema.fields.singletons).isEmpty()
    assertThat(schema.fields.collections).isEmpty()
  }

  @Test
  fun withNames() {
    val schema = schema("abc1234") {
      addName("FooSchema")
      addName("BarSchema")
    }

    assertThat(schema.hash).isEqualTo("abc1234")
    assertThat(schema.names).containsExactly(SchemaName("FooSchema"), SchemaName("BarSchema"))
    assertThat(schema.fields.singletons).isEmpty()
    assertThat(schema.fields.collections).isEmpty()
  }

  @Test
  fun withSingletons() {
    val schema = schema("abc123") {
      singletons {
        "name" to FieldType.Text
        "age" to FieldType.Int
      }
    }

    assertThat(schema.hash).isEqualTo("abc123")
    assertThat(schema.names).isEmpty()
    assertThat(schema.fields.singletons).containsExactly(
      "name", FieldType.Text,
      "age", FieldType.Int
    )
    assertThat(schema.fields.collections).isEmpty()
  }

  @Test
  fun withCollections() {
    val schema = schema("abc123") {
      collections {
        "emailAddresses" to FieldType.Text
        "luckyNumbers" to FieldType.Int
      }
    }

    assertThat(schema.hash).isEqualTo("abc123")
    assertThat(schema.names).isEmpty()
    assertThat(schema.fields.singletons).isEmpty()
    assertThat(schema.fields.collections).containsExactly(
      "emailAddresses", FieldType.Text,
      "luckyNumbers", FieldType.Int
    )
  }
}
