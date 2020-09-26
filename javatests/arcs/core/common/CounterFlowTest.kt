package arcs.core.common

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class CounterFlowTest {

  @Test
  fun initializes() = runBlockingTest {
    val c = CounterFlow(42)
    assertThat(c.flow.first()).isEqualTo(42)
  }

  @Test
  fun increments() = runBlockingTest {
    val c = CounterFlow(0)
    c.increment()
    assertThat(c.flow.first()).isEqualTo(1)
  }

  @Test
  fun decrements() = runBlockingTest {
    val c = CounterFlow(10)
    c.decrement()
    assertThat(c.flow.first()).isEqualTo(9)
  }

  @Test
  fun incrementsMany() = runBlockingTest {
    val c = CounterFlow(0)
    repeat(77) {
      c.increment()
    }
    assertThat(c.flow.first()).isEqualTo(77)
  }

  @Test
  fun decrementsMany() = runBlockingTest {
    val c = CounterFlow(1000)
    repeat(77) {
      c.decrement()
    }
    assertThat(c.flow.first()).isEqualTo(1000 - 77)
  }

  @Test
  fun concurrencyCheck() = runBlocking<Unit> {
    val c = CounterFlow(0)
    coroutineScope {
      repeat(100000) {
        launch(Dispatchers.Default) { c.increment() }
        launch(Dispatchers.Default) { c.decrement() }
      }
    }
    assertThat(c.flow.first()).isEqualTo(0)
  }

  @Test
  fun concurrencyCheck2() = runBlocking<Unit> {
    val c = CounterFlow(0)
    coroutineScope {
      repeat(100000) {
        launch(Dispatchers.Default) { c.increment() }
        launch(Dispatchers.Default) { c.decrement() }
        launch(Dispatchers.Default) { c.increment() }
      }
    }
    assertThat(c.flow.first()).isEqualTo(100000)
  }
}
