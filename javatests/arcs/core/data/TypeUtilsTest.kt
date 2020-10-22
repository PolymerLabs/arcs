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

import arcs.core.data.expression.InferredType
import arcs.core.data.expression.MapScope
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private const val testField = "test"

/** Tests for TypeUtils. */
@RunWith(JUnit4::class)
class TypeUtilsTest {

  @Before
  fun setUp() {
    SchemaRegistry.clearForTest()
  }

  private fun makeSchemaForType(fieldType: FieldType, isCollection: Boolean) =
    EntityType(
      Schema(
        setOf(SchemaName("Test")),
        SchemaFields(mapOf(testField to fieldType), emptyMap()),
        hash = "42"
      ).also {
        SchemaRegistry.register(it)
      }
    ).let {
      if (isCollection) CollectionType(it) else SingletonType(it)
    }

  val allTypes = mapOf(
    FieldType.Boolean to InferredType.Primitive.BooleanType,
    FieldType.Byte to InferredType.Primitive.ByteType,
    FieldType.Char to InferredType.Primitive.ShortType,
    FieldType.Short to InferredType.Primitive.ShortType,
    FieldType.Int to InferredType.Primitive.IntType,
    FieldType.Instant to InferredType.Primitive.LongType,
    FieldType.Long to InferredType.Primitive.LongType,
    FieldType.BigInt to InferredType.Primitive.BigIntType,
    FieldType.Double to InferredType.Primitive.DoubleType,
    FieldType.Float to InferredType.Primitive.FloatType,
    FieldType.Number to InferredType.Primitive.NumberType,
    FieldType.Text to InferredType.Primitive.TextType
  )

  private fun schemaFieldOf(type: InferredType): InferredType = when (type) {
    is InferredType.ScopeType -> type.scope.lookup(testField)
    is InferredType.SeqType -> schemaFieldOf(type.type)
    else -> throw IllegalArgumentException()
  }

  private fun mapFieldType(fieldType: FieldType, isCollection: Boolean = false) =
    schemaFieldOf(mapTypeToInferredType(makeSchemaForType(fieldType, isCollection)))

  @Test
  fun test_primitiveTypes() {
    allTypes.map { (fieldType, inferredType) ->
      assertThat(mapFieldType(fieldType)).isEqualTo(inferredType)
    }
  }

  @Test
  fun test_primitiveTypes_in_collections() {
    allTypes.map { (fieldType, inferredType) ->
      assertThat(mapFieldType(fieldType, true)).isEqualTo(inferredType)
    }
  }

  @Test
  fun test_tupleType() {
    assertThat(
      mapFieldType(
        FieldType.Tuple(
          FieldType.Int,
          FieldType.Boolean,
          FieldType.ListOf(FieldType.Boolean),
          FieldType.Byte,
          FieldType.Long
        )
      )
    ).isEqualTo(
      InferredType.ScopeType(
        MapScope<InferredType>(
          "test",
          mapOf(
            "first" to InferredType.Primitive.IntType,
            "second" to InferredType.Primitive.BooleanType,
            "third" to InferredType.SeqType(InferredType.Primitive.BooleanType),
            "fourth" to InferredType.Primitive.ByteType,
            "fifth" to InferredType.Primitive.LongType
          )
        )
      )
    )

    assertFailsWith<IllegalArgumentException> {
      mapFieldType(
        FieldType.Tuple(
          FieldType.Int,
          FieldType.Boolean,
          FieldType.ListOf(FieldType.Boolean),
          FieldType.Byte,
          FieldType.Long,
          FieldType.Boolean
        )
      )
    }
  }

  @Test
  fun test_entity_ref() {
    SchemaRegistry.register(
      Schema(
        setOf(SchemaName("test2")),
        SchemaFields(
          mapOf(testField to FieldType.Int),
          emptyMap()
        ),
        "43"
      )
    )

    assertThat(mapFieldType(FieldType.EntityRef("43"))).isEqualTo(
      InferredType.ScopeType(
        MapScope<InferredType>(
          "test2",
          mapOf(
            testField to InferredType.Primitive.IntType
          )
        )
      )
    )
  }

  @Test
  fun test_inline_entity() {
    SchemaRegistry.register(
      Schema(
        setOf(SchemaName("test2")),
        SchemaFields(
          mapOf(testField to FieldType.Int),
          emptyMap()
        ),
        "43"
      )
    )

    assertThat(mapFieldType(FieldType.InlineEntity("43"))).isEqualTo(
      InferredType.ScopeType(
        MapScope<InferredType>(
          "test2",
          mapOf(
            testField to InferredType.Primitive.IntType
          )
        )
      )
    )
  }
}
