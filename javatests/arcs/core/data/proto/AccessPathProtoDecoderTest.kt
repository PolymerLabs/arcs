package arcs.core.data.proto

import arcs.core.data.AccessPath
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class AccessPathProtoDecoderTest {
  @Test
  fun roundTrip_withoutSelectors() {
    val handleConnectionSpec = HandleConnectionSpec(
      "input",
      HandleMode.Write,
      TypeVariable("input")
    )
    val accessPath = AccessPath("TestSpec", handleConnectionSpec)

    val encoded = accessPath.encode()
    val decoded = encoded.decode(mapOf("input" to handleConnectionSpec))

    assertThat(decoded).isEqualTo(accessPath)
  }

  @Test
  fun roundTrip_withSelectors() {
    val handleConnectionSpec = HandleConnectionSpec(
      "input",
      HandleMode.Write,
      TypeVariable("input")
    )
    val accessPath = AccessPath(
      "TestSpec",
      handleConnectionSpec,
      selectors = listOf(
        AccessPath.Selector.Field("address"),
        AccessPath.Selector.Field("street")
      )
    )

    val encoded = accessPath.encode()
    val decoded = encoded.decode(mapOf("input" to handleConnectionSpec))

    assertThat(decoded).isEqualTo(accessPath)
  }

  @Test
  fun roundTrip_storeRoot() {
    val accessPath = AccessPath(
      AccessPath.Root.Store("store_id"),
      listOf(AccessPath.Selector.Field("some_field"))
    )

    assertThat(accessPath.encode().decode(emptyMap())).isEqualTo(accessPath)
  }

  @Test
  fun encode_handleConnectionSpec() {
    val expected = AccessPathProto.newBuilder()
    expected.handle = AccessPathProto.HandleRoot.newBuilder()
      .setHandleConnection("input")
      .setParticleSpec("TestSpec")
      .build()

    val handleConnectionSpec = HandleConnectionSpec(
      "input",
      HandleMode.Write,
      TypeVariable("input")
    )
    val accessPath = AccessPath("TestSpec", handleConnectionSpec)
    val encoded = accessPath.encode()

    assertThat(encoded).isEqualTo(expected.build())
  }

  @Test
  fun encode_handleConnection() {
    val expected = AccessPathProto.newBuilder()
    expected.handle = AccessPathProto.HandleRoot.newBuilder()
      .setHandleConnection("input")
      .setParticleSpec("TestSpec")
      .build()

    val particleSpec = ParticleSpec("TestSpec", emptyMap(), "Location")
    val particle = Recipe.Particle(particleSpec, emptyList())
    val handleConnectionSpec = HandleConnectionSpec(
      "input",
      HandleMode.Write,
      TypeVariable("input")
    )
    val accessPath = AccessPath(particle, handleConnectionSpec)

    assertThat(accessPath.encode()).isEqualTo(expected.build())
  }

  @Test
  fun encode_handle() {
    val expected = AccessPathProto.newBuilder()
    expected.handle = AccessPathProto.HandleRoot.newBuilder()
      .setHandleConnection("handle1")
      .build()

    val handle = Recipe.Handle(
      "handle1",
      Recipe.Handle.Fate.MAP,
      TypeVariable("handle1")
    )
    val accessPath = AccessPath(handle)

    assertThat(accessPath.encode()).isEqualTo(expected.build())
  }

  @Test
  fun encode_store() {
    val expected = AccessPathProto.newBuilder()
    expected.storeId = "store_id"

    val accessPath = AccessPath(AccessPath.Root.Store("store_id"))

    assertThat(accessPath.encode()).isEqualTo(expected.build())
  }

  @Test
  fun decode_detectsMissingConnections() {
    val proto = AccessPathProto.newBuilder()
      .setHandle(AccessPathProto.HandleRoot.newBuilder().setHandleConnection("input"))
      .build()
    val exception = assertFailsWith<IllegalArgumentException> {
      proto.decode(emptyMap())
    }
    assertThat(exception)
      .hasMessageThat()
      .contains("Connection 'input' not found in connection specs!")
  }

  @Test
  fun decode_emptyRootFails() {
    val proto = AccessPathProto.newBuilder().build()
    val exception = assertFailsWith<UnsupportedOperationException> {
      proto.decode(emptyMap())
    }
    assertThat(exception)
      .hasMessageThat()
      .isEqualTo("Unsupported AccessPathProto.Root: ROOT_NOT_SET")
  }

  @Test
  fun decode_selector_emptySelectorFails() {
    val proto = AccessPathProto.Selector.newBuilder().build()
    val exception = assertFailsWith<UnsupportedOperationException> {
      proto.decode()
    }
    assertThat(exception)
      .hasMessageThat()
      .isEqualTo("Unsupported AccessPathProto.Selector: SELECTOR_NOT_SET")
  }
}
