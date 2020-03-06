package arcs.core.data.proto

import arcs.core.data.*
import arcs.core.testutil.assertThrows
import arcs.core.testutil.fail
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.Message.Builder
import com.google.protobuf.Message
import com.google.protobuf.TextFormat
import java.io.File
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
        val schemaProtoText = """
        names:  "Thing"
        names:  "Object"
        """.trimIndent()
        val schema = decodeSchemaProtoText(schemaProtoText)
        assertThat(schema.names).isEqualTo(listOf(SchemaName("Thing"), SchemaName("Object")))
    }

    @Test
    fun decodesSingletonsInSchemaProto() {
        val schemaProtoText = """
        fields {
          key: "text"
          value: {
            primitive: TEXT
          }
        }
        fields {
          key: "bool"
          value: {
            primitive: BOOLEAN
          }
        }
        """.trimIndent()
        val schema = decodeSchemaProtoText(schemaProtoText)
        assertThat(schema.fields.singletons).isEqualTo(
            mapOf("text" to FieldType.Text, "bool" to FieldType.Boolean))
    }
}
