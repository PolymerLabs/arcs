package arcs.core.util

import arcs.core.testutil.assertThrows
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertNull
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Result]. */
@RunWith(JUnit4::class)
class ResultTest {
    @Test
    fun getOrThrowTests() {
        val success = resultOf { 10 }
        assertThat(success.getOrThrow()).isEqualTo(10)
        val error = resultOf {
            throw IllegalArgumentException("Illegal argument")
        }
        val exception = assertThrows(IllegalArgumentException::class) {
            error.getOrThrow()
        }
        assertThat(exception).hasMessageThat().contains("Illegal argument")
    }

    @Test
    fun getOrNullTest() {
        val success = resultOf { 10 }
        assertThat(success.getOrNull()).isEqualTo(10)
        val error = resultOf {
            throw IllegalArgumentException("Illegal argument")
        }
        assertNull(error.getOrNull())
    }
}
