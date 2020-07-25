package arcs.core.data.proto

import arcs.core.data.AccessPath
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
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
}
