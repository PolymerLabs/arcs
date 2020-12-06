package arcs.flags.testing

import arcs.flags.BuildFlags
import arcs.flags.DevModeBuildFlags
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement

/**
 * JUnit [TestRule] which resets [BuildFlags] to its original values before and after each test.
 * Useful when you want to override flag values for particular test methods.
 *
 * Usage:
 *
 * ```kotlin
 *   @get:Rule val rule = BuildFlagsRule.create()
 *
 *   @Before
 *   fun setUp() {
 *     // Default value to use in all your test cases.
 *      BuildFlags.YOUR_FEATURE = true
 *   }
 *
 *   @Test
 *   fun getFoo_flagDisabled_returnsNull() {
 *     // Override for specific test methods.
 *     BuildFlags.YOUR_FEATURE = false
 *     assertThat(something.getFoo()).isNull()
 *   }
 * ```
 *
 * See [parameterized] for details on how to set up parameterized testing using build flags.
 */
class BuildFlagsRule private constructor(
  private val parameters: ParameterizedBuildFlags?,
  private val flags: DevModeBuildFlags
) : TestRule {
  override fun apply(base: Statement, description: Description): Statement {
    return object : Statement() {
      override fun evaluate() {
        flags.reset()
        parameters?.applyTo(flags)
        try {
          base.evaluate()
        } finally {
          flags.reset()
        }
      }
    }
  }

  companion object {
    /** Creates a new [BuildFlagsRule] (un-parameterized; resets to defaults between each test). */
    fun create(): BuildFlagsRule {
      return BuildFlagsRule(parameters = null, flags = BuildFlags)
    }

    /**
     * Creates a parameterized version of [BuildFlagsRule]. Resets to the values contained in the
     * given [parameters] instance between each test run.
     *
     * Usage:
     *
     * ```kotlin
     *   import org.junit.runners.Parameterized
     *
     *   @RunWith(Parameterized::class)
     *   class MyTest(private val parameters: ParameterizedBuildFlags) {
     *
     *     @get:Rule val rule = BuildFlagsRule.parameterized(parameters)
     *
     *     companion object {
     *       @get:JvmStatic
     *       @get:Parameterized.Parameters(name = "{0}")
     *       val PARAMETERS = ParameterizedBuildFlags.of("YOUR_FEATURE", "ANOTHER_FEATURE")
     *     }
     *   }
     * ```
     */
    fun parameterized(parameters: ParameterizedBuildFlags): BuildFlagsRule {
      return BuildFlagsRule(parameters, BuildFlags)
    }

    /**
     * Factory method that allows overriding of the [flags] parameter. Only needed for testing the
     * [BuildFlagsRule] itself. Don't call this method normally; use [create] or [parameterized]
     * instead.
     */
    fun newForTest(parameters: ParameterizedBuildFlags, flags: DevModeBuildFlags): BuildFlagsRule {
      return BuildFlagsRule(parameters, flags)
    }
  }
}
