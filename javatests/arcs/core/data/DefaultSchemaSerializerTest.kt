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
package arcs.core.data

import arcs.core.data.expression.asExpr
import arcs.core.data.expression.gte
import arcs.core.data.expression.lt
import arcs.core.data.expression.num
import arcs.core.data.expression.query
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for the [DefaultSchemaSerializer]. */
@RunWith(JUnit4::class)
class DefaultSchemaSerializerTest {

  @Test
  fun serialize_fromSchema_successfulRoundTrip() {
    assertThat(SERIALIZER.deserialize(SERIALIZER.serialize(DUMMY_SCHEMA))).isEqualTo(DUMMY_SCHEMA)
  }

  @Test
  fun serialize_fromSerialized_successfulRoundTrip() {
    val payload = SERIALIZER.serialize(DUMMY_SCHEMA)
    assertThat(SERIALIZER.serialize(SERIALIZER.deserialize(payload))).isEqualTo(payload)
  }

  companion object {
    val SERIALIZER = DefaultSchemaSerializer()

    val DUMMY_SCHEMA = Schema(
      names = setOf(
        SchemaName("Cat"), SchemaName("Carolyn"), SchemaName("Manager")
      ),
      fields = SchemaFields(
        singletons = mapOf(
          "firstName" to FieldType.Text,
          "address" to FieldType.Text,
          "age" to FieldType.Int,
          "ref" to FieldType.EntityRef(
            schemaHash = "x1y2z3",
            annotations = listOf(Annotation("hardRef"))
          )
        ),
        collections = mapOf(
          "clientNumbers" to FieldType.Text
        )
      ),
      hash = "PrincessCarolyn123A",
      refinementExpression = 10.asExpr() gte num("bla"),
      queryExpression = 20.asExpr() lt query("arg")
    )

    val INNER_SCHEMA = Schema(
      names = setOf(SchemaName("Inner")),
      fields = SchemaFields(
        singletons = emptyMap(),
        collections = emptyMap()
      ),
      hash = "x1y2z3"
    )
  }
}
