package arcs.core.data.proto

import arcs.core.data.Capabilities
import arcs.core.data.Recipe.Handle
import arcs.core.data.TypeVariable
import arcs.core.testutil.assertThrows
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
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
        assertThrows(IllegalArgumentException::class) {
            HandleProto.Fate.UNSPECIFIED.decode()
        }
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
    fun decodesCapabilitiesList() {
        assertThat(
            listOf(HandleProto.Capability.TIED_TO_ARC).decode()
        ).isEqualTo(Capabilities.TiedToArc)
        assertThat(
            listOf(HandleProto.Capability.TIED_TO_RUNTIME).decode()
        ).isEqualTo(Capabilities.TiedToRuntime)
        assertThat(
            listOf(HandleProto.Capability.PERSISTENT).decode()
        ).isEqualTo(Capabilities.Persistent)
        assertThat(
            listOf(HandleProto.Capability.QUERYABLE).decode()
        ).isEqualTo(Capabilities.Queryable)
        assertThat(
            listOf(
                HandleProto.Capability.QUERYABLE,
                HandleProto.Capability.PERSISTENT
            ).decode()
        ).isEqualTo(Capabilities.PersistentQueryable)

        assertThrows(IllegalArgumentException::class) {
            listOf(HandleProto.Capability.UNRECOGNIZED).decode()
        }
    }

    @Test
    fun decodesHandleProtoWithNoType() {
        val storageKey = "ramdisk://a"
        val handleText = buildHandleProtoText(
            "notype_thing", "CREATE", "", storageKey, "handle_c", listOf("TIED_TO_ARC")
        )
        val handles = mapOf(
            "handle_c" to Handle("handle_c", Handle.Fate.MAP, TypeVariable("handle_c")),
            "handle1" to Handle("handle1", Handle.Fate.MAP, TypeVariable("handle1"))
        )
        val handleProto = parseHandleProtoText(handleText)
        with(handleProto.decode(handles)) {
            assertThat(name).isEqualTo("notype_thing")
            assertThat(id).isEqualTo("")
            assertThat(fate).isEqualTo(Handle.Fate.CREATE)
            assertThat(storageKey).isEqualTo("ramdisk://a")
            assertThat(associatedHandles).containsExactly(handles["handle1"], handles["handle_c"])
            assertThat(type).isEqualTo(TypeVariable("notype_thing"))
            assertThat(tags).isEmpty()
            assertThat(capabilities).isEqualTo(Capabilities.TiedToArc)
        }
    }

    @Test
    fun decodesHandleProtoWithType() {
        val entityTypeProto =
            """
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
            "thing",
            "JOIN",
            "type { ${entityTypeProto} }",
            storageKey,
            "handle_join",
            listOf("PERSISTENT", "QUERYABLE")
        )
        val handleProto = parseHandleProtoText(handleText)

        val handles = mapOf(
            "handle1" to Handle("handle1", Handle.Fate.MAP, TypeVariable("handle1")),
            "handle_join" to Handle("handle_join", Handle.Fate.JOIN, TypeVariable("handle_join"))
        )
        with(handleProto.decode(handles)) {
            assertThat(name).isEqualTo("thing")
            assertThat(id).isEqualTo("")
            assertThat(fate).isEqualTo(Handle.Fate.JOIN)
            assertThat(storageKey).isEqualTo("ramdisk://b")
            assertThat(associatedHandles).isEqualTo(listOf(handles["handle1"], handles["handle_join"]))
            assertThat(type).isEqualTo(entityType)
            assertThat(tags).isEmpty()
            assertThat(capabilities).isEqualTo(Capabilities.PersistentQueryable)
        }
    }

    @Test
    fun decodesHandleProtoWithTypeAndTags() {
        val entityTypeProto =
            """
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
            "thing",
            "JOIN",
            "type { ${entityTypeProto} }",
            storageKey,
            "handle_join",
            listOf("PERSISTENT", "QUERYABLE"),
            listOf("foo", "bar", "baz")
        )
        val handleProto = parseHandleProtoText(handleText)

        val handles = mapOf(
            "handle1" to Handle(
                "handle1",
                Handle.Fate.MAP,
                TypeVariable("handle1"),
                tags = listOf("foo", "bar", "baz")
            ),
            "handle_join" to Handle(
                "handle_join",
                Handle.Fate.JOIN,
                TypeVariable("handle_join"),
                tags = listOf("foo", "bar", "baz")
            )
        )
        with(handleProto.decode(handles)) {
            assertThat(name).isEqualTo("thing")
            assertThat(id).isEqualTo("")
            assertThat(fate).isEqualTo(Handle.Fate.JOIN)
            assertThat(storageKey).isEqualTo("ramdisk://b")
            assertThat(associatedHandles).isEqualTo(listOf(handles["handle1"], handles["handle_join"]))
            assertThat(type).isEqualTo(entityType)
            assertThat(tags).containsExactly("foo", "bar", "baz")
            assertThat(capabilities).isEqualTo(Capabilities.PersistentQueryable)
        }
    }

    @Test
    fun decodesHandleProtoWithId() {
        val storageKey = "ramdisk://a"
        val handleText = buildHandleProtoText(
            "notype_thing",
            "CREATE",
            "",
            storageKey,
            "handle_c",
            listOf("TIED_TO_ARC"),
            emptyList(),
            "veryofficialid_2342"
        )
        val handles = mapOf(
            "handle_c" to Handle(
                "handle_c",
                Handle.Fate.MAP,
                TypeVariable("handle_c")
            ),
            "handle1" to Handle(
                "handle1",
                Handle.Fate.MAP,
                TypeVariable("handle1")
            )
        )
        val handleProto = parseHandleProtoText(handleText)
        with(handleProto.decode(handles)) {
            assertThat(name).isEqualTo("notype_thing")
            assertThat(id).isEqualTo("veryofficialid_2342")
            assertThat(fate).isEqualTo(Handle.Fate.CREATE)
            assertThat(storageKey).isEqualTo("ramdisk://a")
            assertThat(associatedHandles).containsExactly(handles["handle1"], handles["handle_c"])
            assertThat(type).isEqualTo(TypeVariable("notype_thing"))
            assertThat(tags).isEmpty()
            assertThat(capabilities).isEqualTo(Capabilities.TiedToArc)
        }
    }

    /** A helper function to build a handle proto in text format. */
    fun buildHandleProtoText(
        name: String,
        fate: String,
        type: String,
        storageKey: String,
        associatedHandle: String,
        capabilities: List<String>,
        tags: List<String> = emptyList(),
        id: String = ""
    ) =
        """
          name: "${name}"
          id: "${id}"
          fate: ${fate}
          storage_key: "$storageKey"
          associated_handles: "handle1"
          associated_handles: "${associatedHandle}"
          ${type}
          ${capabilities.joinToString { "capabilities: $it" }}
          ${tags.joinToString { """tags: "$it"""" }}
        """.trimIndent()
}
