package arcs.flags

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DefaultFlagsTest {
  @Test
  fun defaultTrue() {
    assertThat(DefaultTestBuildFlags.FEATURE_ENABLED_BY_DEFAULT).isTrue()
  }

  @Test
  fun defaultFalse() {
    assertThat(DefaultTestBuildFlags.FEATURE_DISABLED_BY_DEFAULT).isFalse()
  }
}
