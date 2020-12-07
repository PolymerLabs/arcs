package arcs.flags

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class BuildFlagsTest {
  @Test
  fun defaultValues_devMode() {
    assertThat(DevModeBuildFlagsForTesting.NOT_READY_FEATURE).isFalse()
    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE).isTrue()
    assertThat(DevModeBuildFlagsForTesting.LAUNCHED_FEATURE).isTrue()
  }

  @Test
  fun defaultValues_releaseMode() {
    assertThat(ReleaseModeBuildFlagsForTesting.NOT_READY_FEATURE).isFalse()
    assertThat(ReleaseModeBuildFlagsForTesting.READY_FEATURE).isFalse()
    assertThat(ReleaseModeBuildFlagsForTesting.LAUNCHED_FEATURE).isTrue()
  }

  @Test
  fun overriddenValues_devMode() {
    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE_OVERRIDDEN_TO_TRUE).isTrue()
    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE_OVERRIDDEN_TO_FALSE).isFalse()
    assertThat(DevModeBuildFlagsForTesting.LAUNCHED_FEATURE_OVERRIDDEN_TO_TRUE).isTrue()
  }

  @Test
  fun overriddenValues_releaseMode() {
    assertThat(ReleaseModeBuildFlagsForTesting.READY_FEATURE_OVERRIDDEN_TO_TRUE).isTrue()
    assertThat(ReleaseModeBuildFlagsForTesting.READY_FEATURE_OVERRIDDEN_TO_FALSE).isFalse()
    assertThat(ReleaseModeBuildFlagsForTesting.LAUNCHED_FEATURE_OVERRIDDEN_TO_TRUE).isTrue()
  }

  @Test
  fun requiredFlags_requiredFlagDisabled_throws() {
    DevModeBuildFlagsForTesting.FEATURE_REQUIRED_BY_OTHERS = false

    assertFailsWith<IllegalArgumentException> {
      DevModeBuildFlagsForTesting.FEATURE_WITH_DEPENDENCY = true
    }
  }

  @Test
  fun requiredFlags_requiredFlagEnabled_doesNotThrow() {
    DevModeBuildFlagsForTesting.FEATURE_REQUIRED_BY_OTHERS = true
    DevModeBuildFlagsForTesting.FEATURE_WITH_DEPENDENCY = true
  }

  @Test
  fun updateAndReset_devMode() {
    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE).isTrue()

    DevModeBuildFlagsForTesting.READY_FEATURE = false

    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE).isFalse()

    DevModeBuildFlagsForTesting.reset()

    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE).isTrue()
  }

  // Can't test updateAndReset_releaseMode, since reset method doesn't exist.
}
