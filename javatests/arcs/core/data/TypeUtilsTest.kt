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
import arcs.core.data.expression.asExpr
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private const val testField = "test"
private const val testField2 = "test2"

/** Tests for TypeUtils. */
@RunWith(JUnit4::class)
class TypeUtilsTest {

  @Before
  fun setUp() {
    SchemaRegistry.clearForTest()
    // Enable the nullable support by default.
    BuildFlags.NULLABLE_VALUE_SUPPORT = true
  }

  @Test
  fun mapFieldTypeToInferredType_primitiveTypes() {
    ALL_TYPES.map { (fieldType, inferredType) ->
      assertThat(mapFieldType(fieldType)).isEqualTo(inferredType)
    }
  }

  @Test
  fun mapFieldTypeToInferredType_primitiveTypesInCollection() {
    ALL_TYPES.map { (fieldType, inferredType) ->
      assertThat(mapFieldType(fieldType, true)).isEqualTo(inferredType)
    }
  }

  @Test
  fun mapFieldTypeToInferredType_nullable() {
    assertThat(
      mapFieldType(FieldType.Long.nullable())
    ).isEqualTo(
      InferredType.UnionType(setOf(
        InferredType.Primitive.LongType,
        InferredType.Primitive.NullType
      ))
    )
  }

  @Test
  fun nullableValueSupportDisabled_mapFieldTypeToInferredType_nullableDegrades() {
    // Ensures that disabling nullable support falls back to non-nullable values.
    BuildFlags.NULLABLE_VALUE_SUPPORT = false
    assertThat(
      mapFieldType(FieldType.Long.nullable())
    ).isEqualTo(
      InferredType.Primitive.LongType
    )
  }

  @Test
  fun nullableValueSupportDisabled_mapFieldTypeToInferredType_nullableOfDisabled() {
    // Ensures that disabling nullable support disallows construction of NullableOf
    BuildFlags.NULLABLE_VALUE_SUPPORT = false
    assertFailsWith<BuildFlagDisabledError> {
      FieldType.NullableOf(FieldType.Long)
    }
  }

  @Test
  fun mapFieldTypeToInferredType_tupleType() {
    assertThat(
      mapFieldType(
        FieldType.Tuple(
          FieldType.Int,
          FieldType.ListOf(FieldType.Boolean),
          FieldType.Byte,
          FieldType.Long,
          FieldType.Long.nullable()
        )
      )
    ).isEqualTo(
      InferredType.ScopeType(
        MapScope<InferredType>(
          "test",
          mapOf(
            "first" to InferredType.Primitive.IntType,
            "second" to InferredType.SeqType(InferredType.Primitive.BooleanType),
            "third" to InferredType.Primitive.ByteType,
            "fourth" to InferredType.Primitive.LongType,
            "fifth" to InferredType.UnionType(setOf(
              InferredType.Primitive.LongType,
              InferredType.Primitive.NullType
            ))
          )
        )
      )
    )

    assertThat(
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
      }.message
    ).isEqualTo("Tuple of size 6 not supported, 5 is the maximum tuple size.")
  }

  @Test
  fun mapFieldTypeToInferredType_entityRefTypeWithsSchema() {
    SchemaRegistry.register(
      Schema(
        setOf(SchemaName(testField2)),
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
          testField2,
          mapOf(
            testField to InferredType.Primitive.IntType
          )
        )
      )
    )
  }

  @Test
  fun mapFieldTypeToInferredType_inlineEntityType() {
    SchemaRegistry.register(
      Schema(
        setOf(SchemaName(testField2)),
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
          testField2,
          mapOf(
            testField to InferredType.Primitive.IntType
          )
        )
      )
    )
  }

  @Test
  fun mapFieldTypeToInferredType_singletonType() {
    val schema = Schema(
      setOf(SchemaName(testField2)),
      SchemaFields(
        mapOf(testField to FieldType.Int),
        emptyMap()
      ),
      "43"
    ).also {
      SchemaRegistry.register(it)
    }

    assertThat(mapTypeToInferredType(SingletonType(EntityType(schema)))).isEqualTo(
      InferredType.ScopeType(
        MapScope<InferredType>(
          testField2,
          mapOf(
            testField to InferredType.Primitive.IntType
          )
        )
      )
    )
  }

  @Test
  fun mapFieldTypeToInferredType_muxType() {
    val schema = Schema(
      setOf(SchemaName(testField2)),
      SchemaFields(
        mapOf(testField to FieldType.Int),
        emptyMap()
      ),
      "43"
    ).also {
      SchemaRegistry.register(it)
    }

    assertThat(mapTypeToInferredType(MuxType(EntityType(schema)))).isEqualTo(
      InferredType.ScopeType(
        MapScope<InferredType>(
          testField2,
          mapOf(
            testField to InferredType.Primitive.IntType
          )
        )
      )
    )
  }

  @Test
  fun constructTypeScope_emptyMapScope() {
    val typeMap = emptyMap<String, Type>()

    val scope = constructTypeScope(typeMap)
    assertThat(scope.scopeName).isEqualTo("root")
    assertThat(scope.properties()).isEqualTo(emptySet<String>())
  }

  @Test
  fun constructTypeScope_mapScopeWithSingletonAndCollection() {
    SchemaRegistry.register(REFERENCED_DUMMY_SCHEMA)
    SchemaRegistry.register(DUMMY_SCHEMA)

    val ent = EntityType(DUMMY_SCHEMA)
    val scope = constructTypeScope(
      mapOf(
        testField to SingletonType(ent),
        testField2 to CollectionType(ent)
      )
    )
    assertThat(scope.scopeName).isEqualTo("root")
    assertThat(scope.properties()).isEqualTo(setOf<String>(testField, testField2))

    val dummyType = mapTypeToInferredType(ent)
    assertThat(scope.lookup<InferredType>(testField)).isEqualTo(dummyType)
    assertThat(scope.lookup<InferredType>(testField2)).isEqualTo(InferredType.SeqType(dummyType))
  }

  @Test
  fun singletonType_toSchema_returnsContainedSchema() {
    val testType = SingletonType(EntityType(DUMMY_SCHEMA))

    val obtainedSchema = testType.toSchema()

    assertThat(obtainedSchema).isEqualTo(DUMMY_SCHEMA)
  }

  @Test
  fun collectionType_toSchema_returnsContainedSchema() {
    val testType = CollectionType(EntityType(DUMMY_SCHEMA))

    val obtainedSchema = testType.toSchema()

    assertThat(obtainedSchema).isEqualTo(DUMMY_SCHEMA)
  }

  @Test
  fun entityType_toSchema_returnsEntitySchema() {
    val testType = EntityType(DUMMY_SCHEMA)

    val obtainedSchema = testType.toSchema()

    assertThat(obtainedSchema).isEqualTo(DUMMY_SCHEMA)
  }

  @Test
  fun unsupportedType_toSchema_throwsIllegalArgException() {
    val testType = CountType()

    assertFailsWith<IllegalArgumentException> {
      testType.toSchema()
    }
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

  private fun schemaFieldOf(type: InferredType): InferredType = when (type) {
    is InferredType.ScopeType -> type.scope.lookup(testField)
    is InferredType.SeqType -> schemaFieldOf(type.type)
    else -> throw IllegalArgumentException()
  }

  private fun mapFieldType(fieldType: FieldType, isCollection: Boolean = false) =
    schemaFieldOf(mapTypeToInferredType(makeSchemaForType(fieldType, isCollection)))

  companion object {
    val ALL_TYPES = mapOf(
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

    // This test schema is used for the Type.toSchema tests above. Its contents are not relevant
    // to the tests, the goal was to populate the fields with some "typical" values.
    private val DUMMY_SCHEMA = Schema(
      names = setOf(SchemaName("Name"), SchemaName("NickNames")),
      fields = SchemaFields(
        singletons = mapOf(
          "legalName" to FieldType.Text
        ),
        collections = mapOf(
          "nick" to FieldType.EntityRef("abc")
        )
      ),
      hash = "abc123",
      refinementExpression = true.asExpr(),
      queryExpression = true.asExpr()
    )
    private val REFERENCED_DUMMY_SCHEMA = Schema(
      names = setOf(SchemaName("NickName")),
      fields = SchemaFields(
        singletons = mapOf(
          "name" to FieldType.Text
        ),
        collections = emptyMap()
      ),
      hash = "abc",
      refinementExpression = true.asExpr(),
      queryExpression = true.asExpr()
    )
  }
}
