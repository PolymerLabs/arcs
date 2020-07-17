package arcs.core.data.proto

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Parses a given proto text as [ClaimProto]. */
fun parseClaimProto(protoText: String): ClaimProto {
    val builder = ClaimProto.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build()
}

@RunWith(JUnit4::class)
class ClaimProtoDecoderTest {
    @Test
    fun decodesAssumeClaim() {
        val protoText = """
          assume {
            access_path {
              particle_spec: "TestSpec"
              handle_connection: "output"
            }
            predicate {
              label {
                semantic_tag: "public"
              }
            }
          }
        """.trimIndent()
        val handleConnectionSpec = HandleConnectionSpec(
            "output",
            HandleMode.Write,
            TypeVariable("output")
        )
        val connectionSpecs = listOf(handleConnectionSpec).associateBy { it.name }
        val claim = parseClaimProto(protoText).decode(connectionSpecs)
        val assume = requireNotNull(claim as Claim.Assume)
        assertThat(assume).isEqualTo(
            Claim.Assume(
                AccessPath("TestSpec", handleConnectionSpec),
                Predicate.Label(
                    InformationFlowLabel.SemanticTag("public")
                )
            )
        )
    }

    @Test
    fun decodesDerivesFromClaim() {
        val protoText = """
          derives_from {
            target {
              particle_spec: "TestSpec"
              handle_connection: "output"
            }
            source {
              particle_spec: "TestSpec"
              handle_connection: "input"
            }
          }
        """.trimIndent()
        val outputSpec = HandleConnectionSpec(
            "output",
            HandleMode.Write,
            TypeVariable("output")
        )
        val inputSpec = HandleConnectionSpec(
            "input",
            HandleMode.Read,
            TypeVariable("output")
        )
        val connectionSpecs = listOf(inputSpec, outputSpec).associateBy { it.name }
        val claim = parseClaimProto(protoText).decode(connectionSpecs)
        val derivesFrom = requireNotNull(claim as Claim.DerivesFrom)
        assertThat(derivesFrom).isEqualTo(
            Claim.DerivesFrom(
                target = AccessPath("TestSpec", outputSpec),
                source = AccessPath("TestSpec", inputSpec)
            )
        )
    }
}
