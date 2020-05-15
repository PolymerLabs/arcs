package arcs.core.data.proto

import arcs.core.data.AccessPath
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.TypeVariable
import arcs.core.testutil.fail
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Parses a given proto text as [AccessPathProto]. */
fun parseAccessPathProto(protoText: String): AccessPathProto {
    val builder = AccessPathProto.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build()
}

@RunWith(JUnit4::class)
class AccessPathProtoDecoderTest {
    @Test
    fun decodesAccessPathNoSelectors() {
        val protoText = """
            particle_spec: "TestSpec"
            handle_connection: "input"
        """.trimIndent()
        val handleConnectionSpec = HandleConnectionSpec(
            "input",
            HandleMode.Write,
            TypeVariable("input")
        )
        val connectionSpecs = listOf(handleConnectionSpec).associateBy { it.name }
        val accessPath = parseAccessPathProto(protoText).decode(connectionSpecs)
        val root = accessPath.root as AccessPath.Root.HandleConnectionSpec
        assertThat(root.particleSpecName).isEqualTo("TestSpec")
        assertThat(root.connectionSpec).isEqualTo(handleConnectionSpec)
    }

    @Test
    fun detectsMissingConnections() {
        val protoText = """
        handle_connection: "input"
        """.trimIndent()
        val exception = assertFailsWith<IllegalArgumentException> {
            parseAccessPathProto(protoText).decode(emptyMap())
        }
        assertThat(exception)
            .hasMessageThat()
            .contains("Connection 'input' not found in connection specs!")
    }
}
