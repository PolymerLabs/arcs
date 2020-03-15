package arcs.core.data.proto

import arcs.core.data.Recipe.Handle
import arcs.core.data.TypeVariable
import arcs.core.testutil.assertThrows
import arcs.core.testutil.fail
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.Message.Builder
import com.google.protobuf.Message
import com.google.protobuf.TextFormat
import java.io.File
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Parses a given proto text as [HandleProto]. */
fun parseHandleProtoText(protoText: String): HandleProto {
    val builder = HandleProto.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build()
}

@RunWith(JUnit4::class)
class HandleProtoDecoderTest {
    @Test
    fun decodesHandleProtoFate() {
        assertThat(HandleProto.Fate.CREATE.decode()).isEqualTo(Handle.Fate.CREATE)
        assertThat(HandleProto.Fate.USE.decode()).isEqualTo(Handle.Fate.USE)
        assertThat(HandleProto.Fate.MAP.decode()).isEqualTo(Handle.Fate.MAP)
        assertThat(HandleProto.Fate.COPY.decode()).isEqualTo(Handle.Fate.COPY)
        assertThat(HandleProto.Fate.JOIN.decode()).isEqualTo(Handle.Fate.JOIN)
        assertThrows(IllegalArgumentException::class) {
            HandleProto.Fate.UNRECOGNIZED.decode()
        }
    }

    @Test
    fun decodesHandleProtoWithNoType() {
        val storageKey = "ramdisk://a"
        val handleText = buildHandleProtoText("notype_thing", "CREATE", "", storageKey, "handle_c")
        val handleProto = parseHandleProtoText(handleText)
        val handle = handleProto.decode()
        assertThat(handle.name).isEqualTo("notype_thing")
        assertThat(handle.fate).isEqualTo(Handle.Fate.CREATE)
        assertThat(handle.storageKey).isEqualTo("ramdisk://a")
        assertThat(handle.associatedHandles).containsExactly("handle1", "handle_c")
        assertThat(handle.type).isEqualTo(TypeVariable("notype_thing"))
   }

    @Test
    fun decodesHandleProtoWithType() {
        val entityTypeProto = """
          entity {
            schema {
              names: "Thing"
              fields {
                key: "name"
                value: { primitive: TEXT }
              }
            }
          }
        """.trimIndent()
        val storageKey = "ramdisk://b"
        val entityType = parseTypeProtoText(entityTypeProto).decode()
        val handleText = buildHandleProtoText(
            "thing", "JOIN", "type { ${entityTypeProto} }", storageKey, "handle_join"
        )
        val handleProto = parseHandleProtoText(handleText)
        val handle = handleProto.decode()
        assertThat(handle.name).isEqualTo("thing")
        assertThat(handle.fate).isEqualTo(Handle.Fate.JOIN)
        assertThat(handle.storageKey).isEqualTo("ramdisk://b")
        assertThat(handle.associatedHandles).isEqualTo(listOf("handle1", "handle_join"))
        assertThat(handle.type).isEqualTo(entityType)
    }

    /** A helper function to build a handle proto in text format. */
    fun buildHandleProtoText(
        name: String,
        fate: String,
        type: String,
        storageKey: String,
        associatedHandle: String
    ) = """
      name: "${name}"
      fate: ${fate}
      storage_key: "$storageKey"
      associated_handles: "handle1"
      associated_handles: "${associatedHandle}"
      ${type}
    """.trimIndent()
}
