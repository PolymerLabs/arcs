package arcs.core.data.proto

import arcs.core.data.*
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Decodes the text proto [protoText] for [SchemaProto] as [Schema]. */
fun decodeSchemaProtoText(protoText: String): Schema {
    val builder = SchemaProto.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build().decode()
}

@RunWith(JUnit4::class)
class SchemaProtoDecoderTest {

    @Test
    fun decodesNamesInSchemaProto() {
        // schema Thing, Object
        val schemaProtoText = """
        names:  "Thing"
        names:  "Object"
        """.trimIndent()
        val schema = decodeSchemaProtoText(schemaProtoText)
        assertThat(schema.names).containsExactly(SchemaName("Thing"), SchemaName("Object"))
    }

    @Test
    fun decodesSingletonsInSchemaProto() {
        // schema
        //   text: Text
        //   bool: Boolean
        val schemaProtoText = """
        fields {
          key: "text"
          value: { primitive: TEXT }
        }
        fields {
          key: "bool"
          value: { primitive: BOOLEAN }
        }
        """.trimIndent()
        val schema = decodeSchemaProtoText(schemaProtoText)
        assertThat(schema.fields.singletons).isEqualTo(
            mapOf("text" to FieldType.Text, "bool" to FieldType.Boolean))
    }

    @Test
    fun decodesCollectionsInSchemaProto() {
        // schema
        //   text: [ Text ]
        //   bool: [ Boolean ]
        val schemaProtoText = """
        fields {
          key: "text"
          value: {
            collection { collection_type: { primitive: TEXT } }
          }
        }
        fields {
          key: "bool"
          value: {
            collection { collection_type: { primitive: BOOLEAN } }
          }
        }
        """.trimIndent()
        val schema = decodeSchemaProtoText(schemaProtoText)
        assertThat(schema.fields.collections).isEqualTo(
            mapOf("text" to FieldType.Text, "bool" to FieldType.Boolean))
    }

    @Test
    fun decodesCollectionsOfReferencesInSchemaProto() {
        // schema
        //   text: [&Product {name: Text}]
        //   num: [&Review {rating: Number}]
        val schemaProtoText = """
        fields {
          key: "text"
          value: {
            collection { collection_type: { reference { referred_type {
              entity: {
                schema: {
                  names: "Product"
                  fields: {
                    key: "name"
                    value: { primitive: TEXT } 
                  }
                  hash: "a76bdd3a638fc17a5b3e023edb542c1e891c4c89"
                }
              }
            } } } }
          }
        }
        fields {
          key: "num"
          value: {
            collection { collection_type: { reference { referred_type {
              entity: {
                schema: {
                  names: "Review"
                  fields: {
                    key: "rating"
                    value: { primitive: NUMBER } 
                  }
                  hash: "2d3317e5ef54fbdf3fbc02ed481c2472ebe9ba66"
                }
              }
            } } } }
          }
        }
        """.trimIndent()
        val schema = decodeSchemaProtoText(schemaProtoText)
        assertThat(schema.fields.collections).isEqualTo(
            mapOf(
                "text" to FieldType.EntityRef("a76bdd3a638fc17a5b3e023edb542c1e891c4c89"),
                "num" to FieldType.EntityRef("2d3317e5ef54fbdf3fbc02ed481c2472ebe9ba66")
            )
        )
    }

    @Test
    fun decodesSingletonsOfTuplesInSchemaProto() {
        // schema
        //   tuple: (Text, Number)
        val schemaProtoText = """
        fields {
          key: "tuple"
          value: {
            tuple: {
              elements: { primitive: TEXT }
              elements: { primitive: NUMBER }
            }
          }
        }
        """.trimIndent()
        val schema = decodeSchemaProtoText(schemaProtoText)
        assertThat(schema.fields.singletons).isEqualTo(
            mapOf(
                "tuple" to FieldType.Tuple(listOf(FieldType.Text, FieldType.Number))
            )
        )
    }

    @Test
    fun decodesCollectionsOfTuplesInSchemaProto() {
        // schema
        //   tuples: [(Text, Number)]
        val schemaProtoText = """
        fields {
          key: "tuples"
          value: {
            collection: {
              collection_type: {
                tuple: {
                  elements: { primitive: TEXT }
                  elements: { primitive: NUMBER }
                }
              }
            }
          }
        }
        """.trimIndent()
        val schema = decodeSchemaProtoText(schemaProtoText)
        assertThat(schema.fields.collections).isEqualTo(
            mapOf(
                "tuples" to FieldType.Tuple(listOf(FieldType.Text, FieldType.Number))
            )
        )
    }
}
