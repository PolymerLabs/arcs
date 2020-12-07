package arcs.core.analysis

import arcs.core.data.Check
import arcs.core.data.Recipe
import arcs.core.data.proto.decodeRecipes
import arcs.core.testutil.protoloader.loadManifestBinaryProto
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertWithMessage
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.io.File

@RunWith(JUnit4::class)
class InformationFlowTest {

  /** Returns the path for the manifest proto binary file for the test. */
  private fun getManifestProtoTextPath(test: String): String {
    return runfilesDir() + "javatests/arcs/core/analysis/testdata/$test.arcs"
  }

  /** Returns the path for the manifest proto binary file for the test. */
  private fun getManifestProtoBinPath(test: String): String {
    return "javatests/arcs/core/analysis/testdata/$test.binarypb"
  }

  /** A helper function to decode a RecipeProto in a [file] in the testdata directory. */
  private fun parseManifestWithSingleRecipe(file: String): Recipe {
    val manifestProto = loadManifestBinaryProto(getManifestProtoBinPath(file))
    val recipes = manifestProto.decodeRecipes()
    return recipes.single()
  }

  private fun Check.asString(): String {
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
      "fail_different_tag",
      "fail_no_tags",
      "fail_not_tag_claim",
      "fail_not_tag_cancels",
      "fail_negated_tag_present",
      "fail_read_write_mismatch_claim_check",
      "fail_multiple_inputs_one_untagged",
      "fail_check_multiple_or_tags",
      "fail_multiple_checks",
      "fail_no_inputs",
      "fail_mixer",
      "fail_derives_from_cycle",
      "fail_derives_from_multiple",
      "fail_join_tuple_components",
      "fail_check_on_subpaths",
      "fail_no_claim_is_empty_labels"
    )
    val okTests = listOf(
      "ok_directly_satisfied",
      "ok_not_tag_claim_no_checks",
      "ok_not_tag_claim_reclaimed",
      "ok_negated_missing_tag",
      "ok_read_write_match_claim_check",
      "ok_multiple_inputs_correct_tags",
      "ok_claim_propagates",
      "ok_claim_not_overriden_later",
      "ok_check_multiple_or_tags",
      "ok_check_multiple_and_single_claim",
      "ok_check_multiple_or_single_claim",
      "ok_derives_from_cycle",
      "ok_derives_from_multiple",
      "ok_join_simple",
      "ok_join_tuple_components",
      "ok_check_on_subpaths"
    )
    val failingFieldTests = listOf(
      "fail_field_entity_direct",
      "fail_field_entity_ref_direct",
      "fail_field_entity_ref_field",
      "fail_field_collection_direct",
      "fail_field_inline_entity_direct",
      "fail_field_list_direct",
      "fail_field_tuple_direct",
      "fail_field_inline_entity_slicing",
      "fail_field_claim_propagates",
      "fail_field_claim_propagates_type_variables",
      "fail_field_merge_multiple_paths"
    )
    val okFieldTests = listOf(
      "ok_field_entity_direct",
      "ok_field_entity_ref_direct",
      "ok_field_entity_ref_field",
      "ok_field_collection_direct",
      "ok_field_inline_entity_direct",
      "ok_field_list_direct",
      "ok_field_tuple_direct",
      "ok_field_inline_entity_slicing",
      "ok_field_claim_propagates",
      "ok_field_claim_propagates_type_variables",
      "ok_field_merge_multiple_paths"
    )
    val okCycleTests = listOf(
      "ok_cycle_overlapping",
      "ok_cycle_single_particle",
      "ok_cycle_two_particles",
      "ok_cycle_claim_propagates",
      "ok_cycle_two_origin"
    )
    val failingCycleTests = listOf(
      "fail_cycle_overlapping_a",
      "fail_cycle_overlapping_b",
      "fail_cycle_remove_tag",
      "fail_cycle_remove_tag_in_chain"
    )
    val typeVariableTests = listOf(
      "fail_type_variables",
      "fail_type_variables_no_constraints",
      "fail_type_variables_collection",
      "fail_type_variables_tuples",
      "fail_type_variables_tuples_collection",
      "fail_type_variables_multiple_constraints"
    )
    val tests = (
      okTests + failingTests +
        okFieldTests + failingFieldTests +
        okCycleTests + failingCycleTests +
        typeVariableTests
      )
    tests.forEach { verifyChecksInTestFile(it) }
  }

  companion object {
    val INGRESS_PREFIX = "// #Ingress:"
    val FAIL_PREFIX = "// #Fail:"
    val OK_PREFIX = "// #OK"
  }
}
