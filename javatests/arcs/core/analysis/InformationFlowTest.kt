package arcs.core.analysis

import arcs.core.data.Check
import arcs.core.data.Recipe
import arcs.core.data.proto.decodeRecipes
import arcs.core.testutil.protoloader.loadManifestBinaryProto
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertWithMessage
import java.io.File
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class InformationFlowTest {

    /** Returns the path for the manifest proto binary file for the test. */
    private fun getManifestProtoTextPath(test: String): String {
        val testText = test.replace("-", "_")
        return runfilesDir() + "javatests/arcs/core/analysis/testdata/${testText}.arcs"
    }

    /** Returns the path for the manifest proto binary file for the test. */
    private fun getManifestProtoBinPath(test: String): String {
        return "javatests/arcs/core/analysis/testdata/${test}.pb.bin"
    }

    /** A helper function to decode a RecipeProto in a [file] in the testdata directory. */
    private fun parseManifestWithSingleRecipe(file: String): Recipe {
        val manifestProto = loadManifestBinaryProto(getManifestProtoBinPath(file))
        val recipes = manifestProto.decodeRecipes()
        return recipes.single()
    }

    private fun Check.asString(): String {
        this as Check.Assert
        return "$accessPath is $predicate"
    }

    private fun verifyChecksInTestFile(test: String) {
        val manifestFile = getManifestProtoTextPath(test)

        // Collect ingresses and failures from the test file.
        val ingresses = mutableListOf<String>()
        val violations = mutableListOf<String>()
        var hasOk = false
        File(manifestFile).forEachLine {
            when {
                it.startsWith(INGRESS_PREFIX, ignoreCase = true) ->
                    ingresses.add(it.replace(INGRESS_PREFIX, "", ignoreCase = true).trim())
                it.startsWith(FAIL_PREFIX, ignoreCase = true) ->
                    violations.add(it.replace(FAIL_PREFIX, "", ignoreCase = true).trim())
                it.startsWith(OK_PREFIX, ignoreCase = true) -> hasOk = true
            }
        }
        assertWithMessage("Test '$test' has no ingresses!").that(ingresses).isNotEmpty()
        assertWithMessage("Test '$test' has neither `OK` nor violations!")
            .that(hasOk || !violations.isEmpty())
            .isTrue()
        assertWithMessage("Test '$test' has both `OK` and violations!")
            .that(hasOk && !violations.isEmpty())
            .isFalse()
        val recipe = parseManifestWithSingleRecipe(test)
        val result = InformationFlow.computeLabels(recipe, ingresses.toList())
        val actualViolations = result.checks.flatMap { (particle, checks) ->
            checks
                .filterNot { result.verify(particle, it) }
                .map { it.asString() }
        }
        assertWithMessage("Unexpected DFA behavior for test '$test'")
            .that(actualViolations)
            .containsExactlyElementsIn(violations)
    }

    @Test
    fun checksAreVerifiedInDFA() {
        val failingTests = listOf(
            "fail-different-tag",
            "fail-no-tags",
            "fail-not-tag-claim",
            "fail-not-tag-cancels",
            "fail-negated-tag-present",
            "fail-read-write-mismatch-claim-check",
            "fail-multiple-inputs-one-untagged",
            "fail-check-multiple-or-tags",
            "fail-multiple-checks",
            "fail-no-inputs",
            "fail-mixer",
            "fail-derives-from-cycle",
            "fail-derives-from-multiple",
            "fail-join-tuple-components",
            "fail-check-on-subpaths"
        )
        val okTests = listOf(
            "ok-directly-satisfied",
            "ok-not-tag-claim-no-checks",
            "ok-not-tag-claim-reclaimed",
            "ok-negated-missing-tag",
            "ok-read-write-match-claim-check",
            "ok-multiple-inputs-correct-tags",
            "ok-claim-propagates",
            "ok-claim-not-overriden-later",
            "ok-check-multiple-or-tags",
            "ok-check-multiple-and-single-claim",
            "ok-check-multiple-or-single-claim",
            "ok-derives-from-cycle",
            "ok-derives-from-multiple",
            "ok-join-simple",
            "ok-join-tuple-components",
            "ok-check-on-subpaths"
        )
        val failingFieldTests = listOf(
            "fail-field-entity-direct",
            "fail-field-entity-ref-direct",
            "fail-field-collection-direct",
            "fail-field-claim-propagates",
            "fail-field-merge-multiple-paths"
        )
        val okFieldTests = listOf(
            "ok-field-entity-direct",
            "ok-field-entity-ref-direct",
            "ok-field-collection-direct",
            "ok-field-claim-propagates",
            "ok-field-merge-multiple-paths"
        )
        val okCycleTests = listOf(
            "ok-cycle-overlapping",
            "ok-cycle-single-particle",
            "ok-cycle-two-particles",
            "ok-cycle-claim-propagates",
            "ok-cycle-two-origin"
        )
        val failingCycleTests = listOf(
            "fail-cycle-overlapping-a",
            "fail-cycle-overlapping-b",
            "fail-cycle-remove-tag",
            "fail-cycle-remove-tag-in-chain"
        )
        val tests = (
            okTests + failingTests +
            okFieldTests + failingFieldTests +
            okCycleTests + failingCycleTests
        )
        tests.forEach { verifyChecksInTestFile(it) }
    }

    companion object {
        val INGRESS_PREFIX = "// #Ingress:"
        val FAIL_PREFIX = "// #Fail:"
        val OK_PREFIX = "// #OK"
    }
}
