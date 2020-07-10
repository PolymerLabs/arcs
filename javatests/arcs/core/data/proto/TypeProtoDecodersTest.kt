package arcs.core.data.proto

import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.data.TupleType
import arcs.core.data.TypeVariable
import arcs.core.testutil.fail
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Parses a given proto text as [TypeProto]. */
fun parseTypeProtoText(protoText: String): TypeProto {
    val builder = TypeProto.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build()
}

@RunWith(JUnit4::class)
class TypeProtoDecodersTest {
    @Test
    fun decodesPrimitiveTypes() {
        assertThat(PrimitiveTypeProto.TEXT.decode()).isEqualTo(PrimitiveType.Text)
        assertThat(PrimitiveTypeProto.BOOLEAN.decode()).isEqualTo(PrimitiveType.Boolean)
        assertThat(PrimitiveTypeProto.NUMBER.decode()).isEqualTo(PrimitiveType.Number)
        assertFailsWith<IllegalArgumentException> {
            PrimitiveTypeProto.UNRECOGNIZED.decode()
        }
    }

    @Test
    fun decodesPrimitiveTypeAsFieldType() {
        val textField = PrimitiveTypeProto.TEXT.decodeAsFieldType()
        assertThat(textField.primitiveType).isEqualTo(PrimitiveType.Text)
        val numberField = PrimitiveTypeProto.NUMBER.decodeAsFieldType()
        assertThat(numberField.primitiveType).isEqualTo(PrimitiveType.Number)
        val booleanField = PrimitiveTypeProto.BOOLEAN.decodeAsFieldType()
        assertThat(booleanField.primitiveType).isEqualTo(PrimitiveType.Boolean)
    }

    @Test
    fun decodesTypeProtoAsFieldType() {
        fun checkPrimitive(textProto: String, expected: PrimitiveType) {
            val primitiveTypeProto = parseTypeProtoText(textProto)
            val field = primitiveTypeProto.decodeAsFieldType()
            when (field) {
                is FieldType.Primitive ->
                    assertThat(field.primitiveType).isEqualTo(expected)
                else -> fail("TypeProto should have been decoded to [FieldType.Primitive].")
            }
        }
        checkPrimitive("primitive: TEXT", PrimitiveType.Text)
        checkPrimitive("primitive: BOOLEAN", PrimitiveType.Boolean)
        checkPrimitive("primitive: NUMBER", PrimitiveType.Number)
        assertFailsWith<IllegalArgumentException> {
            checkPrimitive("""variable: { name: "Blah"}""", PrimitiveType.Text)
        }
    }

    @Test
    fun decodesEntityTypeProtoAsEntityType() {
        val entityTypeProto = """
        entity {
          schema {
            names: "Person"
            fields: {
              key: "name"
              value: { primitive: TEXT }
            }
          }
        }
        """.trimIndent()
        val entityType = parseTypeProtoText(entityTypeProto).decode()
        val expectedSchema = Schema(
            names = setOf(SchemaName("Person")),
            fields = SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = mapOf()
            ),
            hash = ""
        )
        when (entityType) {
            is EntityType -> assertThat(entityType.entitySchema).isEqualTo(expectedSchema)
            else -> fail("TypeProto should have been decoded to [EntityType].")
        }
    }

    @Test
    fun decodesSingletonTypeProtoAsSingletonType() {
        val singletonTypeProto = """
        singleton {
          singleton_type {
            entity {
              schema {
                names: "Foo"
                fields: {
                  key: "value"
                  value: { primitive: TEXT }
                }
              }
            }
          }
        }
        """.trimIndent()
        val singletonType = parseTypeProtoText(singletonTypeProto).decode()
        val expectedSchema = Schema(
            names = setOf(SchemaName("Foo")),
            fields = SchemaFields(
                singletons = mapOf("value" to FieldType.Text),
                collections = mapOf()
            ),
            hash = ""
        )
        when (singletonType) {
            is SingletonType<*> -> assertThat(singletonType.containedType).isEqualTo(
                EntityType(expectedSchema))
            else -> fail("TypeProto should have been decoded to [SingletonType].")
        }
    }

    @Test
    fun decodesCollectionTypeProtoAsCollectionType() {
        val collectionTypeProto = """
        collection {
          collection_type {
            entity {
              schema {
                names: "Person"
                fields: {
                  key: "name"
                  value: { primitive: TEXT }
                }
              }
            }
          }
        }
        """.trimIndent()
        val collectionType = parseTypeProtoText(collectionTypeProto).decode()
        val expectedSchema = Schema(
            names = setOf(SchemaName("Person")),
            fields = SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = mapOf()
            ),
            hash = ""
        )
        when (collectionType) {
            is CollectionType<*> -> assertThat(collectionType.collectionType).isEqualTo(
                EntityType(expectedSchema)
            )
            else -> fail("TypeProto should have been decoded to [CollectionType].")
        }
    }

    @Test
    fun decodesReferenceTypeProtoAsReferenceType() {
        val referenceTypeProto = """
        reference {
          referred_type {
            entity {
              schema {
                names: "Person"
                fields: {
                  key: "name"
                  value: { primitive: TEXT }
                }
              }
            }
          }
        }
        """.trimIndent()
        val referenceType = parseTypeProtoText(referenceTypeProto).decode()
        val expectedSchema = Schema(
            names = setOf(SchemaName("Person")),
            fields = SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = mapOf()
            ),
            hash = ""
        )
        when (referenceType) {
            is ReferenceType<*> -> assertThat(referenceType.containedType).isEqualTo(
                EntityType(expectedSchema)
            )
            else -> fail("TypeProto should have been decoded to [ReferenceType].")
        }
    }

    @Test
    fun decodesCountTypeProtoAsCountType() {
        val countTypeProto = "count {}"
        val countType = parseTypeProtoText(countTypeProto).decode()
        assertThat(countType).isInstanceOf(CountType::class.java)
    }

    @Test
    fun decodesTupleTypeProtoAsReferenceType() {
        val tupleTypeProto = """
        tuple {
          elements {
            entity {
              schema {
                names: "Person"
                fields: {
                  key: "name"
                  value: { primitive: TEXT }
                }
              }
            }
          }
          elements {
            entity {
              schema {
                names: "Age"
                fields: {
                  key: "value"
                  value: { primitive: NUMBER }
                }
              }
            }
          }
        }
        """.trimIndent()
        val tupleType = parseTypeProtoText(tupleTypeProto).decode()
        val personSchema = Schema(
            names = setOf(SchemaName("Person")),
            fields = SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = mapOf()
            ),
            hash = ""
        )
        val ageSchema = Schema(
            names = setOf(SchemaName("Age")),
            fields = SchemaFields(
                singletons = mapOf("value" to FieldType.Number),
                collections = mapOf()
            ),
            hash = ""
        )
        when (tupleType) {
            // Using `listOf` instead of containsExactly to ensure order is preserved when decoding.
            is TupleType -> assertThat(tupleType.elementTypes).isEqualTo(
                listOf(EntityType(personSchema), EntityType(ageSchema))
            )
            else -> fail("TypeProto should have been decoded to [TupleType].")
        }
    }

    @Test
    fun decodesVariableTypeProtoAsVariableType() {
        val variableTypeProto = """
        variable {
          name: "a"
          constraint { constraint_type {
            entity {
              schema {
                names: "Person"
                fields: {
                  key: "name"
                  value: { primitive: TEXT }
                }
              }
            }
          } 
          }
        }
        """.trimIndent()
        val variableType = parseTypeProtoText(variableTypeProto).decode()
        val expectedSchema = Schema(
            names = setOf(SchemaName("Person")),
            fields = SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = mapOf()
            ),
            hash = ""
        )
        when (variableType) {
            is TypeVariable -> assertThat(variableType).isEqualTo(
                TypeVariable("a", EntityType(expectedSchema))
            )
            else -> fail("TypeProto should have been decoded to [TypeVariable].")
        }
    }

    @Test
    fun decodesVariableTypeProtoAsUnconstrainedVariableType() {
        val variableTypeProto = """
        variable {
          name: "a"
        }
        """.trimIndent()
        val variableType = parseTypeProtoText(variableTypeProto).decode()
        when (variableType) {
            is TypeVariable -> assertThat(variableType).isEqualTo(TypeVariable("a", null))
            else -> fail("TypeProto should have been decoded to [TypeVariable].")
        }
    }
}
