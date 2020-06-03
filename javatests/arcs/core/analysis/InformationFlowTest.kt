package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Check
import arcs.core.data.Claim
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import arcs.core.data.Recipe
import arcs.core.data.Recipe.Particle
import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.decodeRecipes
import arcs.core.util.Log
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class InformationFlowTest {
    /** A helper function to decode a RecipeProto in a [file] in the testdata directory. */
    private fun parseManifestWithSingleRecipe(file: String): Recipe {
        val binPath =
            runfilesDir() + "javatests/arcs/core/analysis/testdata/${file}.pb.bin"
        val manifestProto = ManifestProto.parseFrom(File(binPath).readBytes())
        val recipes = manifestProto.decodeRecipes()
        return requireNotNull(recipes.firstOrNull())
    }

    private fun Check.asString(): String {
        this as Check.Assert
        return "${accessPath} is $predicate"
    }

    /**
     * Describes a test for a DFA, where [file] contains the manifest proto, [ingresses] is the
     * name of ingress handles, and [violation] is the expected violation (if any).
     */
    data class DFATest(
        val file: String,
        val ingresses: List<String>,
        val violation: List<String> = emptyList()
    )

    /** Returns null if the recipe is valid. Otherwise, returns the first violating check. */
    private fun getViolatingChecks(test: String, ingresses: List<String>): List<String> {
        val recipe = parseManifestWithSingleRecipe(test)
        val result = InformationFlow.computeLabels(recipe, ingresses)
        return result.checks.flatMap { (particle, checks) ->
            checks.filter {
                check -> !result.verify(particle, check)
            }.map { it.asString() }
        }
    }

    @Test
    fun successDFA() {
        val tests = listOf(
            DFATest("ok-directly-satisfied", listOf("P1")),
            DFATest("ok-not-tag-claim-no-checks", listOf("P1")),
            DFATest("ok-not-tag-claim-reclaimed", listOf("P1")),
            DFATest("ok-negated-missing-tag", listOf("P")),
            DFATest("ok-read-write-match-claim-check", listOf("P")),
            DFATest("ok-multiple-inputs-correct-tags", listOf("P1", "P2")),
            DFATest("ok-claim-propagates", listOf("P1")),
            DFATest("ok-claim-not-overriden-later", listOf("P1")),
            DFATest("ok-check-multiple-or-tags", listOf("P1", "P2")),
            DFATest("ok-check-multiple-and-single-claim", listOf("P1")),
            DFATest("ok-check-multiple-or-single-claim", listOf("P1"))
        )
        tests.forEach { (test, ingresses, _) ->
            assertWithMessage("Test '$test' should be valid!")
                .that(getViolatingChecks(test, ingresses)).isEmpty()
        }
    }

    @Test
    fun failDFA() {
        val tests = listOf(
            DFATest("fail-different-tag", listOf("P1"), listOf("hc:P2.bar is trusted")),
            DFATest("fail-no-tags", listOf("P1"), listOf("hc:P2.bar is trusted")),
            DFATest("fail-not-tag-claim", listOf("P1"), listOf("hc:P2.bar is trusted")),
            DFATest("fail-not-tag-cancels", listOf("P1"), listOf("hc:P3.bye is trusted")),
            DFATest("fail-negated-tag-present", listOf("P1"), listOf("hc:P2.bar is not private")),
            DFATest("fail-read-write-mismatch-claim-check", listOf("P"), listOf("hc:P.foo is t1")),
            DFATest(
                "fail-multiple-inputs-one-untagged",
                listOf("P1", "P2"),
                listOf("hc:P3.bar is trusted")
            ),
            DFATest(
                "fail-check-multiple-or-tags",
                listOf("P1", "P2"),
                listOf("hc:P3.bar is (tag1 or tag2)")
            ),
            DFATest(
                "fail-multiple-checks",
                listOf("P1"),
                listOf("hc:P2.bar1 is trusted", "hc:P2.bar2 is extraTrusted")
            ),
            DFATest("fail-no-inputs", listOf("P.bar"), listOf("hc:P.bar is trusted")),
            DFATest(
                "fail-mixer",
                listOf("IngestionAppName", "IngestionLocation"),
                listOf(
                    "hc:Egress2.data is (packageName and coarseLocation)",
                    "hc:Egress4.data is safeToLog",
                    "hc:Egress5.data is " +
                    "((packageName and safeToLog) or (coarseLocation and safeToLog))"
                )
            )
        )
        tests.forEach { (test, ingresses, violations) ->
            assertWithMessage("Test '$test' should be invalid!")
                .that(getViolatingChecks(test, ingresses))
                .isEqualTo(violations)
        }
    }
}
