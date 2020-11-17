package arcs.flags.testing

import arcs.flags.BuildFlags
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
 *   @get:Rule val rule = BuildFlagsRule()
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
 */
class BuildFlagsRule : TestRule {
  override fun apply(base: Statement, description: Description): Statement {
    return object : Statement() {
      override fun evaluate() {
        BuildFlags.reset()
        try {
          base.evaluate()
        } finally {
          BuildFlags.reset()
        }
      }
    }
  }
}
