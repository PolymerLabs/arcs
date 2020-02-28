package arcs.core.data.proto

import arcs.core.data.PrimitiveType
import arcs.core.testutil.assertThrows
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.Message.Builder
import com.google.protobuf.Message
import com.google.protobuf.TextFormat
import java.io.File
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


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
}
