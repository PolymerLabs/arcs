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
    fun decode_primitiveType() {
        assertThat(PrimitiveTypeProto.TEXT.decode()).isEqualTo(PrimitiveType.Text)
        assertThat(PrimitiveTypeProto.BOOLEAN.decode()).isEqualTo(PrimitiveType.Boolean)
        assertThat(PrimitiveTypeProto.NUMBER.decode()).isEqualTo(PrimitiveType.Number)
        assertFailsWith<IllegalArgumentException> {
            PrimitiveTypeProto.UNRECOGNIZED.decode()
        }
    }

    @Test
    fun decodeAsFieldType_primitiveType() {
        val textTypeProto = TypeProto.newBuilder().setPrimitive(PrimitiveTypeProto.TEXT).build()
        assertThat(textTypeProto.decodeAsFieldType()).isEqualTo(FieldType.Text)

        val numTypeProto = TypeProto.newBuilder().setPrimitive(PrimitiveTypeProto.NUMBER).build()
        assertThat(numTypeProto.decodeAsFieldType()).isEqualTo(FieldType.Number)

        val boolTypeProto = TypeProto.newBuilder().setPrimitive(PrimitiveTypeProto.BOOLEAN).build()
        assertThat(boolTypeProto.decodeAsFieldType()).isEqualTo(FieldType.Boolean)
    }

    @Test
    fun decodeAsFieldType_referenceType() {
        val referenceTypeProto = parseTypeProtoText("""
            reference {
              referred_type {
                entity {
                  schema {
                    names: "Empty"
                  }
                }
              }
            }
        """.trimIndent())
        // Won't bother checking the hash, just check the type.
        assertThat(referenceTypeProto.decodeAsFieldType()).isInstanceOf(
            FieldType.EntityRef::class.java
        )
    }

    @Test
    fun decodeAsFieldType_tupleType() {
        val tupleTypeProto = parseTypeProtoText("""
            tuple {
              elements {
                primitive: TEXT
              }
              elements {
                primitive: NUMBER
              }
            }
        """.trimIndent())
        val tupleType = tupleTypeProto.decodeAsFieldType() as FieldType.Tuple
        assertThat(tupleType).isEqualTo(FieldType.Tuple(listOf(FieldType.Text, FieldType.Number)))
    }

    @Test
    fun decodeAsFieldType_listType() {
        val listTypeProto = parseTypeProtoText("""
            list {
              element_type {
                primitive: TEXT
              }
            }
        """.trimIndent())
        val listType = listTypeProto.decodeAsFieldType() as FieldType.ListOf
        assertThat(listType).isEqualTo(FieldType.ListOf(FieldType.Text))
    }

    @Test
    fun decodeAsFieldType_entityType_inline() {
        val listTypeProto = parseTypeProtoText("""
            entity {
              schema {
                names: "Person"
              }
              inline: true
            }
        """.trimIndent())
        // Won't bother checking the contained hash, just check the type.
        assertThat(listTypeProto.decodeAsFieldType()).isInstanceOf(
            FieldType.InlineEntity::class.java
        )
    }

    @Test
    fun decodeAsFieldType_entityType_notInline() {
        val listTypeProto = parseTypeProtoText("""
            entity {
              schema {
                names: "Person"
              }
              inline: false
            }
        """.trimIndent())
        val e = assertFailsWith<IllegalArgumentException> { listTypeProto.decodeAsFieldType() }
        assertThat(e).hasMessageThat().isEqualTo(
            "Cannot decode non-inline entities to FieldType.InlineEntity"
        )
    }

    @Test
    fun decode_entityType_notInline() {
        val entityTypeProto = parseTypeProtoText("""
        entity {
          schema {
            names: "Person"
            fields: {
              key: "name"
              value: { primitive: TEXT }
            }
          }
          inline: false
        }
        """.trimIndent())

        val entityType = entityTypeProto.decode()

        assertThat(entityType).isEqualTo(
            EntityType(
                Schema(
                    names = setOf(SchemaName("Person")),
                    fields = SchemaFields(
                        singletons = mapOf("name" to FieldType.Text),
                        collections = mapOf()
                    ),
                    hash = ""
                )
            )
        )
    }

    @Test
    fun decode_entityType_inline() {
        val entityTypeProto = parseTypeProtoText("""
        entity {
          schema {
            names: "Person"
            fields: {
              key: "name"
              value: { primitive: TEXT }
            }
          }
          inline: true
        }
        """.trimIndent())

        val e = assertFailsWith<IllegalArgumentException> { entityTypeProto.decode() }
        assertThat(e).hasMessageThat().isEqualTo("Cannot decode inline entities to EntityType")
    }

    @Test
    fun decode_singletonType() {
        val singletonTypeProto = parseTypeProtoText("""
        singleton {
          singleton_type {
            $DUMMY_ENTITY_PROTO_TEXT
          }
        }
        """.trimIndent())

        val singletonType = singletonTypeProto.decode()

        assertThat(singletonType).isEqualTo(SingletonType(DUMMY_ENTITY_TYPE))
    }

    @Test
    fun decode_collectionType() {
        val collectionTypeProto = parseTypeProtoText("""
        collection {
          collection_type {
            $DUMMY_ENTITY_PROTO_TEXT
          }
        }
        """.trimIndent())

        val collectionType = collectionTypeProto.decode()

        assertThat(collectionType).isEqualTo(CollectionType(DUMMY_ENTITY_TYPE))
    }

    @Test
    fun decode_referenceType() {
        val referenceTypeProto = parseTypeProtoText("""
        reference {
          referred_type {
            $DUMMY_ENTITY_PROTO_TEXT
          }
        }
        """.trimIndent())

        val referenceType = referenceTypeProto.decode()

        assertThat(referenceType).isEqualTo(ReferenceType(DUMMY_ENTITY_TYPE))
    }

    @Test
    fun decode_countType() {
        val countType = CountTypeProto.getDefaultInstance().decode()
        assertThat(countType).isEqualTo(CountType())
    }

    @Test
    fun decode_tupleType() {
        val tupleTypeProto = parseTypeProtoText("""
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
        )
        val tupleType = tupleTypeProto.decode()

        assertThat(tupleType).isEqualTo(
            TupleType(
                EntityType(
                    Schema(
                        names = setOf(SchemaName("Person")),
                        fields = SchemaFields(
                            singletons = mapOf("name" to FieldType.Text),
                            collections = mapOf()
                        ),
                        hash = ""
                    )
                ),
                EntityType(
                    Schema(
                        names = setOf(SchemaName("Age")),
                        fields = SchemaFields(
                            singletons = mapOf("value" to FieldType.Number),
                            collections = mapOf()
                        ),
                        hash = ""
                    )
                )
            )
        )
    }

    @Test
    fun decode_variableType_constrained() {
        val variableTypeProto = parseTypeProtoText("""
        variable {
          name: "a"
          constraint {
            constraint_type {
              $DUMMY_ENTITY_PROTO_TEXT
            } 
          }
        }
        """.trimIndent())

        val variableType = variableTypeProto.decode()

        assertThat(variableType).isEqualTo(TypeVariable("a", DUMMY_ENTITY_TYPE))
    }

    @Test
    fun decode_variableType_unconstrained() {
        val variableTypeProto = parseTypeProtoText("""
        variable {
          name: "a"
        }
        """.trimIndent())

        val variableType = variableTypeProto.decode()

        assertThat(variableType).isEqualTo(TypeVariable("a"))
    }

    companion object {
        val DUMMY_ENTITY_PROTO_TEXT = """
            entity {
                schema {
                    names: "Dummy"
                }
            }
        """.trimIndent()

        val DUMMY_ENTITY_TYPE = EntityType(
            Schema(
                names = setOf(SchemaName("Dummy")),
                fields = SchemaFields(
                    singletons = emptyMap(),
                    collections = emptyMap()
                ),
                hash = ""
            )
        )
    }
}
