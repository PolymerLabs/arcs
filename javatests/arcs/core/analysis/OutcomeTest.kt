package arcs.core.analysis

import com.google.common.truth.Truth.assertThat
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Outcome]. */
@RunWith(JUnit4::class)
class OutcomeTest {
    @Test
    fun failureReasonTests() {
        assertThat(Outcome.Success<Int>(10).getFailureReason()).isNull()
        assertThat(Outcome.Failure<Int>("Failed!").getFailureReason()).contains("Failed!")
    }

    @Test
    fun getOrElseTests() {
        assertThat(Outcome.Success<Int>(10).getOrElse { 20 }).isEqualTo(10)
        assertThat(Outcome.Failure<Int>("Failed!").getOrElse { 20 }).isEqualTo(20)
    }

    @Test
    fun getOrNullTests() {
        assertThat(Outcome.Success<Int>(10).getOrNull()).isEqualTo(10)
        assertThat(Outcome.Failure<Int>("Failed!").getOrNull()).isNull()
    }

    @Test
    fun toSuccessTests() {
        assertThat(42.toSuccess().getOrNull()).isEqualTo(42)
    }
}
