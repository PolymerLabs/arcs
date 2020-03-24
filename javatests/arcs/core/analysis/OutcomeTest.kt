package arcs.core.analysis

import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Outcome]. */
@RunWith(JUnit4::class)
class OutcomeTest {
    val success = Outcome.Success<Int>(10)
    val failure = Outcome.Failure<Int>("Failure Example")

    @Test
    fun failureReasonTests() {
        assertNull(success.getFailureReason())
        assertThat(failure.getFailureReason()).contains("Failure Example")
    }

    @Test
    fun getOrElseTests() {
        assertThat(success.getOrElse { 20 }).isEqualTo(10)
        assertThat(failure.getOrElse { 20 }).isEqualTo(20)
    }

    @Test
    fun getOrNullTests() {
        assertThat(success.getOrNull()).isEqualTo(10)
        assertNull(failure.getOrNull())
    }

    @Test
    fun toSuccessTests() {
        val success = (42).toSuccess()
        assertThat(success.getOrNull()).isEqualTo(42)
    }
}
