package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFails

@RunWith(JUnit4::class)
class ResultTest {
  @Test
  fun result_ok() {
    val result = Result.Ok(123)

    assertThat(result.get()).isEqualTo(123)
    assertThat(result.unwrap()).isEqualTo(123)
  }

  @Test
  fun result_err() {
    val someError = Exception("SomeError")
    val result = Result.Err<Int>(someError)

    assertThat(result.get()).isNull()
    val e = assertFails { result.unwrap() }
    assertThat(e).isEqualTo(someError)
  }

  @Test
  fun resultOf_ok() {
    val result = resultOf { 123 }

    assertThat(result).isEqualTo(Result.Ok(123))
  }

  @Test
  fun resultOf_err() {
    val someError = Exception("SomeError")

    val result = resultOf<Int> { throw someError }

    assertThat(result).isEqualTo(Result.Err<Int>(someError))
  }
}
