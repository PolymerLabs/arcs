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

/**
 * Parses a given proto text as [TypeProto].
 */
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
        assertThrows(IllegalArgumentException::class) { 
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
        assertThrows(IllegalArgumentException::class) {
            checkPrimitive("""variable: { name: "Blah"}""", PrimitiveType.Text)
        }
    }
}
