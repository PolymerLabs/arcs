package arcs.flags

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class BuildFlagsTest {
  @Test
  fun defaultTrue() {
    assertThat(BuildFlagsForTesting.FEATURE_ENABLED_BY_DEFAULT).isTrue()
  }

  @Test
  fun defaultFalse() {
    assertThat(BuildFlagsForTesting.FEATURE_DISABLED_BY_DEFAULT).isFalse()
  }

  @Test
  fun updateAndReset() {
    assertThat(BuildFlagsForTesting.FEATURE_ENABLED_BY_DEFAULT).isTrue()

    BuildFlagsForTesting.FEATURE_ENABLED_BY_DEFAULT = false

    assertThat(BuildFlagsForTesting.FEATURE_ENABLED_BY_DEFAULT).isFalse()

    BuildFlagsForTesting.reset()

    assertThat(BuildFlagsForTesting.FEATURE_ENABLED_BY_DEFAULT).isTrue()
  }
}
