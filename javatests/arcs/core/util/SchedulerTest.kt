/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.util

import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import java.util.concurrent.CompletableFuture
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import kotlinx.coroutines.yield
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SchedulerTest {
  @get:Rule
  val log = LogRule()

  @Test
  fun simpleTest() = runBlockingTest {
    val scheduler = Scheduler(this)
    val stateHolder = StateHolder()

    val processors = (0 until 100).map {
      createProcess(it, stateHolder)
    }
    val listeners = (0 until 100).map {
      createListener(it, "foo", "FooListener", stateHolder)
    }

    scheduler.schedule(processors + listeners)
    log("Waiting for idle")
    scheduler.waitForIdle()
    log("Idleness achieved")

    assertThat(scheduler.launches.value).isEqualTo(1)

    assertWithMessage("Agenda runs Processors then Listeners, where each batch is in-order.")
      .that(stateHolder.calls)
      .containsExactlyElementsIn(
        (0 until 100).map { it to "Processor" } +
          (0 until 100).map { it to "Listener(foo, FooListener)" }
      )
      .inOrder()

    scheduler.close()
  }

  @Test
  fun tasks_schedulingOtherTasks_dontDeadlock() = runBlockingTest {
    val scheduler = Scheduler(this)
    val stateHolder = StateHolder()

    val processorsToCreate = 10
    var processorsLeftToCreate = processorsToCreate
    fun createProcessor(): TestProcessor {
      return TestProcessor {
        stateHolder.calls.add(processorsToCreate to "Generator")

        processorsLeftToCreate--
        if (processorsLeftToCreate > 0) {
          scheduler.schedule(createProcessor())
        }
      }
    }

    scheduler.schedule(createProcessor())
    yield()
    scheduler.waitForIdle()

    assertThat(processorsLeftToCreate).isEqualTo(0)
    assertThat(stateHolder.calls).hasSize(processorsToCreate)

    scheduler.close()
  }

  @Test
  fun tasks_canTimeout() = runBlocking {
    val schedulerScope = CoroutineScope(Dispatchers.Default)
    val scheduler = Scheduler(
      schedulerScope,
      agendaProcessingTimeoutMs = 100
    )

    var firstProcRan = true
    var secondProcRan = false

    scheduler.schedule(
      listOf(
        TestProcessor {
          firstProcRan = true
          log("First Proc Sleeping")
          Thread.sleep(2000)
          log("First Proc Woke Up")
        },
        TestProcessor {
          secondProcRan = true
          log("Second Proc ran")
        }
      )
    )
    scheduler.waitForIdle()

    assertThat(log.loggedMessages.joinToString("\n"))
      .contains("Scheduled tasks timed out")
    assertWithMessage("First proc should've run")
      .that(firstProcRan).isTrue()
    assertWithMessage("Second proc should've been skipped, because of timeout")
      .that(secondProcRan).isFalse()

    scheduler.cancel()
  }

  @Test
  fun pause_pausesExecution_resume_resumesExecution() = runBlockingTest {
    val scheduler = Scheduler(this)

    val firstCalled = Job()
    var secondCalled = false

    val first = TestProcessor {
      scheduler.pause()
      firstCalled.complete()
    }
    val second = TestProcessor {
      secondCalled = true
    }

    log("scheduling first")
    scheduler.schedule(first)
    firstCalled.join()
    log("scheduling second")
    scheduler.schedule(second)

    assertWithMessage("Second shouldn't have been called")
      .that(secondCalled).isFalse()

    // Now let's resume.
    scheduler.resume()
    scheduler.waitForIdle()

    assertWithMessage("Second should have been called after resume")
      .that(secondCalled).isTrue()

    scheduler.cancel()
  }

  @Test
  fun executesListenersByNamespaceAndName() = runBlockingTest {
    val scheduler = Scheduler(this)
    val stateHolder = StateHolder()

    val firstNamespace = listOf(
      createListener(0, "a", "A", stateHolder),
      createListener(1, "a", "B", stateHolder),
      createListener(2, "a", "C", stateHolder)
    )

    val secondNamespace = listOf(
      createListener(0, "b", "A", stateHolder),
      createListener(1, "b", "B", stateHolder),
      createListener(2, "b", "C", stateHolder)
    )

    scheduler.schedule(firstNamespace + secondNamespace)
    scheduler.waitForIdle()

    assertWithMessage("all namespace'd listeners should be called together")
      .that(stateHolder.calls)
      .containsExactly(
        0 to "Listener(a, A)",
        1 to "Listener(a, B)",
        2 to "Listener(a, C)",
        0 to "Listener(b, A)",
        1 to "Listener(b, B)",
        2 to "Listener(b, C)"
      )
      .inOrder()

    scheduler.cancel()
  }

  @Test
  fun close_waitsForPendingTasks() = runBlocking {
    // We use a blocking get, so this scheduler needs to run on a different thread
    val schedulerScope = CoroutineScope(Dispatchers.Default)
    val scheduler = Scheduler(schedulerScope)

    val testProcessor1 = TestProcessorWithCompletionAndSignaling { }
    val testProcessor2 = TestProcessorWithCompletion { }
    val testProcessor3 = TestProcessorWithCompletion { }

    scheduler.schedule(listOf(testProcessor1.processor, testProcessor2.processor))
    scheduler.schedule(testProcessor3.processor)

    scheduler.close()
    testProcessor1.awaitTaskEntry()
    testProcessor1.proceed()
    scheduler.awaitCompletion()

    assertThat(testProcessor1.completed).isTrue()
    assertThat(testProcessor2.completed).isTrue()
    assertThat(testProcessor3.completed).isTrue()
    schedulerScope.cancel()
  }

  @Test
  fun cancel_cancelsPendingTasks() = runBlocking {
    // We use a blocking get, so this scheduler needs to run on a different thread
    val schedulerScope = CoroutineScope(Dispatchers.Default)
    val scheduler = Scheduler(schedulerScope)

    val testProcessor1 = TestProcessorWithCompletionAndSignaling {}
    val testProcessor2 = TestProcessorWithCompletion { }
    val testProcessor3 = TestProcessorWithCompletion { }

    scheduler.schedule(listOf(testProcessor1.processor, testProcessor2.processor))
    scheduler.schedule(testProcessor3.processor)

    testProcessor1.awaitTaskEntry()
    scheduler.cancel()
    testProcessor1.proceed()
    scheduler.awaitCompletion()

    // Cancel will cancel the channel & coroutine, but not the thread runnign the tasks.
    // So any in flight task  in an agenda will complete.
    assertThat(testProcessor1.completed).isTrue()
    assertThat(testProcessor2.completed).isFalse()
    assertThat(testProcessor3.completed).isFalse()
    schedulerScope.cancel()
  }

  private fun createProcess(index: Int, stateHolder: StateHolder): Scheduler.Task =
    TestProcessor { stateHolder.calls.add(index to "Processor") }

  private fun createListener(
    index: Int,
    namespace: String,
    name: String,
    stateHolder: StateHolder
  ): Scheduler.Task = TestListener(namespace, name) {
    stateHolder.calls.add(index to "Listener($namespace, $name)")
  }

  private class StateHolder(
    val calls: MutableList<Pair<Int, String>> = mutableListOf()
  )

  private class TestProcessorWithCompletionAndSignaling(block: () -> Unit) {
    private val proceedSignal = CompletableFuture<Unit>()
    private val inTaskSignal = CompletableDeferred<Unit>()
    var completed = false
      private set

    val processor = TestProcessor {
      inTaskSignal.complete(Unit)
      proceedSignal.get()
      block()
      completed = true
    }

    /** Suspend until the processor block is entered. */
    suspend fun awaitTaskEntry() { inTaskSignal.await() }

    /** Tell the task to proceed with running its block. */
    fun proceed() { proceedSignal.complete(Unit) }
  }

  private class TestProcessorWithCompletion(block: () -> Unit) {
    var completed = false
      private set
    val processor = TestProcessor {
      block()
      completed = true
    }
  }

  private class TestProcessor(block: () -> Unit) : Scheduler.Task.Processor(block)

  private class TestListener(
    namespace: String,
    name: String,
    block: () -> Unit
  ) : Scheduler.Task.Listener(namespace, name, block)
}
