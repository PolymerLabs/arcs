package arcs.flags

import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/**
 * Tests [BuildFlagsRule] using [ParameterizedBuildFlags]. Checks that the two work together
 * correctly, and serves as an example of how to run a parameterized test using build flags.
 */
@RunWith(Parameterized::class)
class BuildFlagsRuleTest(private val parameters: ParameterizedBuildFlags) {
  @get:Rule
  val buildFlagsRule = BuildFlagsRule.newForTest(parameters, DevModeBuildFlagsForTesting)

  /** Tests that the test class is invoked with a unique set of flags every time. */
  @Test
  fun parametersAlwaysUnique() {
    assertThat(parametersSeen).doesNotContain(parameters)
    parametersSeen.add(parameters)
  }

  /** Tests that the [parameters] object has the expected build flag names. */
  @Test
  fun flagNamesCorrect() {
    assertThat(parameters.values.keys).containsExactly("NOT_READY_FEATURE", "READY_FEATURE")
  }

  /** Tests that the values from [parameters] were correctly applied to the build flags class. */
  @Test
  fun flagsMatchParameters() {
    assertThat(DevModeBuildFlagsForTesting.NOT_READY_FEATURE).isEqualTo(
      parameters.values["NOT_READY_FEATURE"]
    )
    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE).isEqualTo(
      parameters.values["READY_FEATURE"]
    )
  }

  companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of("NOT_READY_FEATURE", "READY_FEATURE")

    private var parametersSeen = mutableSetOf<ParameterizedBuildFlags>()
  }
}
