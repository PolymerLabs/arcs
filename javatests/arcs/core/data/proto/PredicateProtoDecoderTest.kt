package arcs.core.data.proto

import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.testutil.assertThrows
import arcs.core.testutil.fail
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Parses a given proto text as [InfomrationFlowLabelProto]. */
fun parseInformationFlowLabelProto(protoText: String): InformationFlowLabelProto {
    val builder = InformationFlowLabelProto.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build()
}

/** Parses a given proto text as [InfomrationFlowLabelProto.Predicate]. */
fun parsePredicateProto(protoText: String): InformationFlowLabelProto.Predicate {
    val builder = InformationFlowLabelProto.Predicate.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build()
}

@RunWith(JUnit4::class)
class PredicateProtoDecoderTest {
    @Test
    fun decodesInformationFlowLabels() {
        val protoText = """ semantic_tag: "public" """
        val label = parseInformationFlowLabelProto(protoText).decode()
        val semanticTag = requireNotNull(label as? InformationFlowLabel.SemanticTag)
        assertThat(semanticTag.name).isEqualTo("public")
    }

    @Test
    fun decodesLabelPredicate() {
        val protoText = """
          label {
            semantic_tag: "public"
          }
        """.trimIndent()
        val predicate = parsePredicateProto(protoText).decode()
        val labelPredicate = requireNotNull(predicate as? Predicate.Label)
        assertThat(labelPredicate.label)
            .isEqualTo(InformationFlowLabel.SemanticTag("public"))
    }

    @Test
    fun decodesNotPredicate() {
        val protoText = """
          not {
            predicate {
              label {
                semantic_tag: "public"
              }
            }
          }
        """.trimIndent()
        val predicate = parsePredicateProto(protoText).decode()
        val notPredicate = requireNotNull(predicate as? Predicate.Not)
        assertThat(notPredicate).isEqualTo(
            Predicate.Not(Predicate.Label(InformationFlowLabel.SemanticTag("public")))
        )
    }
}

