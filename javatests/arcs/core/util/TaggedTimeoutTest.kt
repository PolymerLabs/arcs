package arcs.core.util

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [withTaggedTimeout]. */
@RunWith(JUnit4::class)
class TaggedTimeoutTest {

  @Test
  fun timeout() = runBlocking {
    try {
      val str = "daisy"
      withTaggedTimeout(10, { "oopsie-$str" }) {
        delay(100)
        fail("should have timed out")
      }
    } catch (e: Exception) {
      assertThat(e).isInstanceOf(TaggedTimeoutException::class.java)
      assertThat(e).hasMessageThat().isEqualTo("Timed out after 10 ms: oopsie-daisy")
    }
    Unit
  }

  @Test
  fun noTimeout_shouldNotThrow() = runBlocking {
    try {
      val result = withTaggedTimeout(100, { "tag" }) {
        "ok"
      }
      assertThat(result).isEqualTo("ok")
    } catch (e: Exception) {
      fail("unexpected timeout: $e")
    }
  }

  @Test
  fun noTimeout_shouldNotExecuteMessageBuilder() = runBlocking {
    val result = withTaggedTimeout(100, { fail("should not execute message builder"); "" }) {
      "ok"
    }
    assertThat(result).isEqualTo("ok")
  }
}
