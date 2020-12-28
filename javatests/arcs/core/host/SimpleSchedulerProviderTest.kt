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

package arcs.core.host

import arcs.core.testutil.runTest
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import java.util.concurrent.Executors
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.withContext
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SimpleSchedulerProviderTest {
  @get:Rule
  val log = LogRule()

  @Test
  fun one_thread_multipleSchedulers() = runTest {
    val coroutineContext = Executors.newSingleThreadExecutor().asCoroutineDispatcher()
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)

    val schedulerA = schedulerProvider("a")
    val schedulerB = schedulerProvider("b")
    val schedulerC = schedulerProvider("c")

    // All should be separate instances.
    assertThat(schedulerA).isNotEqualTo(schedulerB)
    assertThat(schedulerA).isNotEqualTo(schedulerC)
    assertThat(schedulerB).isNotEqualTo(schedulerC)

    val schedulerAThread = CompletableDeferred<Thread>()
    val schedulerBThread = CompletableDeferred<Thread>()
    val schedulerCThread = CompletableDeferred<Thread>()

    // All three run on the same thread.
    schedulerA.schedule(
      SimpleProc("a") { schedulerAThread.complete(Thread.currentThread()) }
    )
    schedulerB.schedule(
      SimpleProc("b") { schedulerBThread.complete(Thread.currentThread()) }
    )
    schedulerC.schedule(
      SimpleProc("c") { schedulerCThread.complete(Thread.currentThread()) }
    )
    assertThat(schedulerAThread.await()).isEqualTo(schedulerBThread.await())
    assertThat(schedulerBThread.await()).isEqualTo(schedulerCThread.await())

    schedulerProvider.cancelAll()
  }

  @Test
  fun throwing_from_a_task_failsTheParentContext() = runTest {
    val e = assertFailsWith<IllegalStateException> {
      withContext(coroutineContext) {
        val schedulerProvider = SimpleSchedulerProvider(coroutineContext)

        val scheduler = schedulerProvider("a")

        scheduler.schedule(
          SimpleProc("test") {
            throw IllegalStateException("Washington DC is not a state.")
          }
        )

        scheduler.waitForIdle()
      }
    }

    assertThat(e).hasMessageThat().contains("Washington DC is not a state.")
  }

  @Test
  fun canceling_thenReInvoking_givesNewScheduler() = runTest {
    val coroutineContext = Executors.newSingleThreadExecutor().asCoroutineDispatcher()
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)

    val scheduler = schedulerProvider("a")

    // Cancel the scheduler, and wait until its job has completed before trying to create
    // another scheduler with the same arcId.
    scheduler.cancel()
    scheduler.awaitCompletion()

    val newScheduler = schedulerProvider("a")
    assertWithMessage(
      "After canceling the original scheduler, we should get a new one, even with the " +
        "same arcId."
    ).that(newScheduler).isNotEqualTo(scheduler)

    schedulerProvider.cancelAll()
  }

  private class SimpleProc(
    val name: String,
    block: () -> Unit
  ) : Scheduler.Task.Processor(block) {
    override fun toString() = "SimpleProc($name)"
  }
}
