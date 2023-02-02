package arcs.core.util.performance

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class TimingMeasurementsTest {
  @After
  fun tearDown() {
    TimingMeasurements.reset()
  }

  @Test
  fun record_newMetric() {
    TimingMeasurements.record("a", 100L)
    TimingMeasurements.record("b", 200L)

    assertThat(TimingMeasurements.get()).containsExactly(
      "a", listOf(100L),
      "b", listOf(200L)
    )
  }

  @Test
  fun record_existingMetric() {
    TimingMeasurements.record("a", 100L)
    TimingMeasurements.record("a", 200L)

    assertThat(TimingMeasurements.get()).containsExactly(
      "a", listOf(100L, 200L)
    )
  }

  @Test
  fun record_invalidMetricName_throws() {
    val e = assertFailsWith<IllegalArgumentException> { TimingMeasurements.record("foo()", 100) }
    assertThat(e).hasMessageThat().isEqualTo("Invalid metric name: foo()")
  }

  @Test
  fun reset_clearsMeasurements() {
    TimingMeasurements.record("a", 100L)

    TimingMeasurements.reset()

    assertThat(TimingMeasurements.get()).isEmpty()
  }

  @Test
  fun getAndReset_returnsMeasurements() {
    TimingMeasurements.record("a", 100L)

    assertThat(TimingMeasurements.getAndReset()).containsExactly(
      "a", listOf(100L)
    )
  }

  @Test
  fun getAndReset_clearsMeasurements() {
    TimingMeasurements.record("a", 100L)

    TimingMeasurements.getAndReset()

    assertThat(TimingMeasurements.get()).isEmpty()
  }
}
