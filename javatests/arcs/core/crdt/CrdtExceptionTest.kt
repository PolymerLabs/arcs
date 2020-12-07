package arcs.core.crdt

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class CrdtExceptionTest {
  @Test
  fun requireNotNull_nullValue_throwsError() {
    val e = assertFailsWith<CrdtException> {
      CrdtException.requireNotNull(null) { "cannot be null!" }
    }
    assertThat(e).hasMessageThat().isEqualTo("cannot be null!")
  }

  @Test
  fun requireNotNull_nonNullValue_returnsValue() {
    CrdtException.requireNotNull("text value") { "unused message" }
    CrdtException.requireNotNull(42) { "unused message" }
    CrdtException.requireNotNull(0) { "unused message" }
    CrdtException.requireNotNull(-1) { "unused message" }
    CrdtException.requireNotNull(true) { "unused message" }
    CrdtException.requireNotNull(false) { "unused message" }
  }

  @Test
  fun require_false_throwsErrorWithMessage() {
    val e = assertFailsWith<CrdtException> {
      CrdtException.require(condition = false) { "this is an error!" }
    }
    assertThat(e).hasMessageThat().isEqualTo("this is an error!")
  }

  @Test
  fun require_true_noErrorThrown() {
    CrdtException.require(condition = true) { "unused message" }
  }
}
