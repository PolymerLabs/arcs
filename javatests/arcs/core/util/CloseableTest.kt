package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CloseableTest {
  @Test
  fun closeableUse_runsBlockThenClose() {
    var blockWasRun = false
    var isClosed = false
    val closeable = object : Closeable {
      override fun close() {
        isClosed = true
      }
    }

    closeable.use {
      assertThat(isClosed).isFalse()
      blockWasRun = true
    }

    assertThat(blockWasRun).isTrue()
    assertThat(isClosed).isTrue()
  }
}
