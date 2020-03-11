package arcs.core.data.proto

import arcs.core.data.*
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.keys.RamDiskStorageKey
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
    @Before
    fun setupTest() {
        RamDiskStorageKey.registerParser()
    }

    @Test
    fun decodesHandleProtoWithNoType() {
        val storageKey = "ramdisk://a"
        val handleText = buildHandleProtoText("notype_thing", "CREATE", "", storageKey)
        val handleProto = parseHandleProtoText(handleText)
        val handle = handleProto.decodeAsHandleConnection(HandleMode.Write)
        assertThat(handle.storageKey).isEqualTo(StorageKeyParser.parse(storageKey))
        assertThat(handle.mode).isEqualTo(HandleMode.Write)
        assertThat(handle.type).isEqualTo(TypeVariable("~notype_thing"))
        assertThat(handle.ttl).isEqualTo(null)
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
            "thing", "JOIN", "type { ${entityTypeProto} }", storageKey
        )
        val handleProto = parseHandleProtoText(handleText)
        val handle = handleProto.decodeAsHandleConnection(HandleMode.Read)
        assertThat(handle.storageKey).isEqualTo(StorageKeyParser.parse(storageKey))
        assertThat(handle.mode).isEqualTo(HandleMode.Read)
        assertThat(handle.type).isEqualTo(entityType)
        assertThat(handle.ttl).isEqualTo(null)
    }

    /** A helper function to build a handle proto in text format. */
    fun buildHandleProtoText(name: String, fate: String, type: String, storageKey: String) = """
      name: "${name}"
      fate: ${fate}
      storage_key: "$storageKey"
      associated_handles: "handle1"
      associated_handles: "handle2"
      ${type}
    """.trimIndent()
}
