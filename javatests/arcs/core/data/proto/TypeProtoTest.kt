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
class TypeProtoTest {
    @Test
    fun decodesPrimitiveTypes() {
        assertThat(PrimitiveTypeProto.TEXT.decode()).isEqualTo(PrimitiveType.Text)
        assertThat(PrimitiveTypeProto.BOOLEAN.decode()).isEqualTo(PrimitiveType.Boolean)
        assertThat(PrimitiveTypeProto.NUMBER.decode()).isEqualTo(PrimitiveType.Number)
        assertThat(PrimitiveTypeProto.BYTE.decode()).isEqualTo(PrimitiveType.Byte)
        assertThat(PrimitiveTypeProto.SHORT.decode()).isEqualTo(PrimitiveType.Short)
        assertThat(PrimitiveTypeProto.INT.decode()).isEqualTo(PrimitiveType.Int)
        assertThat(PrimitiveTypeProto.LONG.decode()).isEqualTo(PrimitiveType.Long)
        assertThat(PrimitiveTypeProto.CHAR.decode()).isEqualTo(PrimitiveType.Char)
        assertThat(PrimitiveTypeProto.FLOAT.decode()).isEqualTo(PrimitiveType.Float)
        assertThat(PrimitiveTypeProto.DOUBLE.decode()).isEqualTo(PrimitiveType.Double)
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

    @Test
    fun encode_typeVariable_withoutConstraint() {
        val innerType = TypeVariable("a")
        assertThat(innerType.encode().variable).isEqualTo(
            TypeVariableProto.newBuilder().setName("a").build()
        )
    }

    @Test
    fun encode_typeVariable_withConstraint() {
        val innerType = TypeVariable("a", constraint = CountType())
        assertThat(innerType.encode().variable).isEqualTo(
            TypeVariableProto.newBuilder()
                .setName("a")
                .setConstraint(
                    ConstraintInfo.newBuilder()
                        .setConstraintType(CountTypeProto.getDefaultInstance().asTypeProto())
                )
                .build()
        )
    }

    @Test
    fun encode_entityType() {
        val schema = Schema(
            names = setOf(SchemaName("a"), SchemaName("b")),
            fields = SchemaFields(
                singletons = emptyMap(),
                collections = emptyMap()
            ),
            hash = "myHash"
        )
        val entityType = EntityType(schema)

        assertThat(entityType.encode().entity).isEqualTo(
            EntityTypeProto.newBuilder().setSchema(
                SchemaProto.newBuilder()
                    .addNames("a")
                    .addNames("b")
                    .setHash("myHash")
            ).build()
        )
    }

    @Test
    fun encode_singletonType() {
        val innerType = TypeVariable("a")
        val singletonType = SingletonType(innerType)
        assertThat(singletonType.encode().singleton).isEqualTo(
            SingletonTypeProto.newBuilder().setSingletonType(innerType.encode()).build()
        )
    }

    @Test
    fun encode_collectionType() {
        val innerType = TypeVariable("a")
        val collectionType = CollectionType(innerType)
        assertThat(collectionType.encode().collection).isEqualTo(
            CollectionTypeProto.newBuilder().setCollectionType(innerType.encode()).build()
        )
    }

    @Test
    fun encode_referenceType() {
        val innerType = TypeVariable("a")
        val referenceType = ReferenceType(innerType)
        assertThat(referenceType.encode().reference).isEqualTo(
            ReferenceTypeProto.newBuilder().setReferredType(innerType.encode()).build()
        )
    }

    @Test
    fun encode_tupleType() {
        val innerType1 = TypeVariable("a")
        val innerType2 = TypeVariable("b")
        val tupleType = TupleType(listOf(innerType1, innerType2))
        assertThat(tupleType.encode().tuple).isEqualTo(
            TupleTypeProto.newBuilder()
                .addElements(innerType1.encode())
                .addElements(innerType2.encode())
                .build()
        )
    }

    @Test
    fun encode_countType() {
        assertThat(CountType().encode().count).isEqualTo(CountTypeProto.getDefaultInstance())
    }
}
