/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.data.proto

import arcs.core.data.Annotation
import arcs.core.data.Recipe.Handle
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Parses a given proto text as [HandleProto]. */
fun parseHandleProtoText(protoText: String): HandleProto {
  val builder = HandleProto.newBuilder()
  TextFormat.getParser().merge(protoText, builder)
  return builder.build()
}

/** Assert that a [HandleProto] is equal to itself after a round trip of decoding and encoding. */
fun assertRoundTrip(proto: HandleProto, handles: Map<String, Handle>) {
  assertThat(proto.decode(handles).encode()).isEqualTo(proto)
}

@RunWith(JUnit4::class)
class HandleProtoDecoderTest {
  @Test
  fun decodesHandleProtoFate() {
    assertFailsWith<IllegalArgumentException> {
      HandleProto.Fate.UNSPECIFIED.decode()
    }
    assertThat(HandleProto.Fate.CREATE.decode()).isEqualTo(Handle.Fate.CREATE)
    assertThat(HandleProto.Fate.USE.decode()).isEqualTo(Handle.Fate.USE)
    assertThat(HandleProto.Fate.MAP.decode()).isEqualTo(Handle.Fate.MAP)
    assertThat(HandleProto.Fate.COPY.decode()).isEqualTo(Handle.Fate.COPY)
    assertThat(HandleProto.Fate.JOIN.decode()).isEqualTo(Handle.Fate.JOIN)
    assertFailsWith<IllegalArgumentException> {
      HandleProto.Fate.UNRECOGNIZED.decode()
    }
  }

  @Test
  fun encodesHandleProtoFate() {
    assertThat(Handle.Fate.CREATE.encode()).isEqualTo(HandleProto.Fate.CREATE)
    assertThat(Handle.Fate.USE.encode()).isEqualTo(HandleProto.Fate.USE)
    assertThat(Handle.Fate.MAP.encode()).isEqualTo(HandleProto.Fate.MAP)
    assertThat(Handle.Fate.COPY.encode()).isEqualTo(HandleProto.Fate.COPY)
    assertThat(Handle.Fate.JOIN.encode()).isEqualTo(HandleProto.Fate.JOIN)
  }

  @Test
  fun decodesHandleProtoWithNoType() {
    val storageKey = "ramdisk://a"
    val handleText = buildHandleProtoText(
      "notype_thing", "CREATE", "", storageKey, "handle_c", "[{name: \"tiedToArc\"}]"
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
      assertThat(annotations)
        .isEqualTo(listOf(Annotation.createCapability("tiedToArc")))
    }
  }

  @Test
  fun roundTripsHandleProtoWithNoType_createsTypeVariable() {
    val storageKey = "ramdisk://a"
    val handleText = buildHandleProtoText(
      "notype_thing", "CREATE", "", storageKey, "handle_c", "[{name: \"tiedToArc\"}]"
    )
    val handles = mapOf(
      "handle_c" to Handle("handle_c", Handle.Fate.MAP, TypeVariable("handle_c")),
      "handle1" to Handle("handle1", Handle.Fate.MAP, TypeVariable("handle1"))
    )
    val handleProto = parseHandleProtoText(handleText)
    val roundTrip = handleProto.decode(handles).encode()

    with(roundTrip) {
      assertThat(name).isEqualTo(handleProto.name)
      assertThat(id).isEqualTo(handleProto.id)
      assertThat(fate).isEqualTo(handleProto.fate)
      assertThat(storageKey).isEqualTo(handleProto.storageKey)
      assertThat(associatedHandlesList).isEqualTo(handleProto.associatedHandlesList)
      assertThat(tagsList).isEqualTo(handleProto.tagsList)
      assertThat(annotationsList).isEqualTo(handleProto.annotationsList)

      // Round-trip should infer a type variable.
      assertThat(type).isEqualTo(TypeVariable("notype_thing").encode())
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
      name = "thing",
      fate = "JOIN",
      type = "type { $entityTypeProto }",
      storageKey = storageKey,
      associatedHandle = "handle_join",
      annotations = "[{name: \"persistent\"}, {name: \"queryable\"}]"
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
      assertThat(associatedHandles).isEqualTo(
        listOf(handles["handle1"], handles["handle_join"])
      )
      assertThat(type).isEqualTo(entityType)
      assertThat(tags).isEmpty()
      assertThat(annotations).isEqualTo(
        listOf(
          Annotation.createCapability("persistent"),
          Annotation.createCapability("queryable")
        )
      )
    }
  }

  @Test
  fun roundTripsHandleProtoWithType() {
    val entityTypeProto =
      """
      entity {
        schema {
          names: "Thing"
          fields {
            key: "name"
            value: { primitive: TEXT }
          }
          refinement: "true"
          query: "true"
        }
      }
      """.trimIndent()
    val storageKey = "ramdisk://b"
    val handleText = buildHandleProtoText(
      name = "thing",
      fate = "JOIN",
      type = "type { $entityTypeProto }",
      storageKey = storageKey,
      associatedHandle = "handle_join",
      annotations = "[{name: \"persistent\"}, {name: \"queryable\"}]"
    )
    val handleProto = parseHandleProtoText(handleText)

    val handles = mapOf(
      "handle1" to Handle("handle1", Handle.Fate.MAP, TypeVariable("handle1")),
      "handle_join" to Handle("handle_join", Handle.Fate.JOIN, TypeVariable("handle_join"))
    )

    assertRoundTrip(handleProto, handles)
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
      name = "thing",
      fate = "JOIN",
      type = "type { $entityTypeProto }",
      storageKey = storageKey,
      associatedHandle = "handle_join",
      annotations = "[{name: \"persistent\"}, {name: \"queryable\"}]",
      tags = listOf("foo", "bar", "baz")
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
      assertThat(associatedHandles).isEqualTo(
        listOf(handles["handle1"], handles["handle_join"])
      )
      assertThat(type).isEqualTo(entityType)
      assertThat(tags).containsExactly("foo", "bar", "baz")
      assertThat(annotations).isEqualTo(
        listOf(
          Annotation.createCapability("persistent"),
          Annotation.createCapability("queryable")
        )
      )
    }
  }

  @Test
  fun roundTrip_handleProtoWithTypeAndTags() {
    val entityTypeProto =
      """
      entity {
        schema {
          names: "Thing"
          fields {
            key: "name"
            value: { primitive: TEXT }
          }
          refinement: "true"
          query: "true"
        }
      }
      """.trimIndent()
    val storageKey = "ramdisk://b"
    val handleText = buildHandleProtoText(
      name = "thing",
      fate = "JOIN",
      type = "type { $entityTypeProto }",
      storageKey = storageKey,
      associatedHandle = "handle_join",
      annotations = "[{name: \"persistent\"}, {name: \"queryable\"}]",
      tags = listOf("foo", "bar", "baz")
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
    assertRoundTrip(handleProto, handles)
  }

  @Test
  fun decodesHandleProtoWithId() {
    val storageKey = "ramdisk://a"
    val handleText = buildHandleProtoText(
      name = "notype_thing",
      fate = "CREATE",
      type = "",
      storageKey = storageKey,
      associatedHandle = "handle_c",
      annotations = "{name: \"tiedToArc\"}",
      tags = emptyList(),
      id = "veryofficialid_2342"
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
      assertThat(annotations)
        .isEqualTo(listOf(Annotation.createCapability("tiedToArc")))
    }
  }

  @Test
  fun roundTrip_handleProtoWithId() {
    val storageKey = "ramdisk://a"
    val handleText = buildHandleProtoText(
      name = "notype_thing",
      fate = "CREATE",
      type = """
      type {
       variable {
         name: "notype_thing"
         constraint {
         }
       }
      }
      """.trimIndent(),
      storageKey = storageKey,
      associatedHandle = "handle_c",
      annotations = "{name: \"tiedToArc\"}",
      tags = emptyList(),
      id = "veryofficialid_2342"
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
    assertRoundTrip(handleProto, handles)
  }

  @Test
  fun roundTrip_handleProtoWithNoStorageKey() {
    val storageKey = null
    val handleText = buildHandleProtoText(
      name = "notype_thing",
      fate = "CREATE",
      type = """
      type {
       variable {
         name: "notype_thing"
         constraint {
         }
       }
      }
      """.trimIndent(),
      storageKey = storageKey,
      associatedHandle = "handle_c",
      annotations = "{name: \"tiedToArc\"}",
      tags = emptyList(),
      id = "veryofficialid_2342"
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
    assertRoundTrip(handleProto, handles)
  }

  /** A helper function to build a handle proto in text format. */
  fun buildHandleProtoText(
    name: String,
    fate: String,
    type: String,
    storageKey: String?,
    associatedHandle: String,
    annotations: String,
    tags: List<String> = emptyList(),
    id: String = ""
  ) =
    """
          name: "$name"
          id: "$id"
          fate: $fate
          ${storageKey?.let { """storage_key: "$storageKey"""" } ?: ""}
          associated_handles: "handle1"
          associated_handles: "$associatedHandle"
          $type
          annotations: $annotations
          ${tags.joinToString { """tags: "$it"""" }}
        """.trimIndent()
}
