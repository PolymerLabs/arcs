package arcs.core.testutil

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import kotlinx.coroutines.yield
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class CallbackChoreographerTest {
  @Test
  fun choregrapherCallback_callsActionAndSignalsCompletion() = runBlockingTest {
    var called = false
    val action = suspend {
      called = true
    }
    val choreographer = CallbackChoreographer(action)

    choreographer.signalCallback()
    choreographer.callback()
    choreographer.awaitCallback()
    assertThat(called).isTrue()
  }

  @Test
  fun choreographerCallback_propagatesException() = runBlockingTest {
    class TestException : Exception("boom")

    val action = suspend {
      throw TestException()
    }
    val choreographer = CallbackChoreographer(action)

    choreographer.signalCallback()
    assertFailsWith<TestException> {
      choreographer.callback()
    }
    choreographer.awaitCallback()
  }

  @Test
  fun choreographerCallback_awaitsSignal() = runBlockingTest {
    var called = false
    val action = suspend {
      called = true
    }
    val choreographer = CallbackChoreographer(action)

    val callbackJob = launch {
      choreographer.callback()
    }
    yield()

    assertThat(callbackJob.isCompleted).isFalse()
    assertThat(called).isFalse()

    choreographer.signalCallback()
    callbackJob.join()
    assertThat(called).isTrue()
  }
}
