package arcs.flags

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

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
  fun updateAndReset_devMode() {
    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE).isTrue()

    DevModeBuildFlagsForTesting.READY_FEATURE = false

    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE).isFalse()

    DevModeBuildFlagsForTesting.reset()

    assertThat(DevModeBuildFlagsForTesting.READY_FEATURE).isTrue()
  }

  // Can't test updateAndReset_releaseMode, since reset method doesn't exist.
}
