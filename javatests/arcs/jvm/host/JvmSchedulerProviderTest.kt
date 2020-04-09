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

package arcs.jvm.host

import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class JvmSchedulerProviderTest {
    @get:Rule
    val log = LogRule()

    @Test
    fun one_thread_multipleSchedulers() = runBlocking {
        val schedulerProvider = JvmSchedulerProvider(coroutineContext, 1)

        val schedulerA = schedulerProvider("a")
        val schedulerB = schedulerProvider("b")
        val schedulerC = schedulerProvider("c")

        // All should be separate instances.
        assertThat(schedulerA).isNotEqualTo(schedulerB)
        assertThat(schedulerA).isNotEqualTo(schedulerC)
        assertThat(schedulerB).isNotEqualTo(schedulerC)

        // Re-fetching the provider with the same arc-id gives the same scheduler.
        assertThat(schedulerProvider("a")).isSameInstanceAs(schedulerA)
        assertThat(schedulerProvider("b")).isSameInstanceAs(schedulerB)
        assertThat(schedulerProvider("c")).isSameInstanceAs(schedulerC)

        val schedulerAThread = CompletableDeferred<Thread>()
        val schedulerBThread = CompletableDeferred<Thread>()
        val schedulerCThread = CompletableDeferred<Thread>()

        // All three run on the same thread.
        schedulerA.schedule(
            SimpleProc { schedulerAThread.complete(Thread.currentThread()) }
        )
        schedulerB.schedule(
            SimpleProc { schedulerBThread.complete(Thread.currentThread()) }
        )
        schedulerC.schedule(
            SimpleProc { schedulerCThread.complete(Thread.currentThread()) }
        )
        assertThat(schedulerAThread.await()).isEqualTo(schedulerBThread.await())
        assertThat(schedulerBThread.await()).isEqualTo(schedulerCThread.await())

        schedulerProvider.cancelAll()
    }

    @Test
    fun two_threads_threeSchedulers_roundRobin() = runBlocking {
        val schedulerProvider = JvmSchedulerProvider(coroutineContext, 2)

        val schedulerA = schedulerProvider("a")
        val schedulerB = schedulerProvider("b")
        val schedulerC = schedulerProvider("c")

        val schedulerAThread = CompletableDeferred<Thread>()
        val schedulerBThread = CompletableDeferred<Thread>()
        val schedulerCThread = CompletableDeferred<Thread>()

        // A and C run on the same thread, but B runs on a different one.
        schedulerA.schedule(
            SimpleProc { schedulerAThread.complete(Thread.currentThread()) }
        )
        schedulerB.schedule(
            SimpleProc { schedulerBThread.complete(Thread.currentThread()) }
        )
        schedulerC.schedule(
            SimpleProc { schedulerCThread.complete(Thread.currentThread()) }
        )
        assertThat(schedulerAThread.await()).isEqualTo(schedulerCThread.await())
        assertThat(schedulerBThread.await()).isNotEqualTo(schedulerCThread.await())
        assertThat(schedulerBThread.await()).isNotEqualTo(schedulerAThread.await())

        schedulerProvider.cancelAll()
    }

    @Test
    fun throwing_from_a_task_failsTheParentContext() = runBlocking {
        val e = assertSuspendingThrows(IllegalStateException::class) {
            withContext(coroutineContext) {
                val schedulerProvider = JvmSchedulerProvider(coroutineContext, 1)

                val scheduler = schedulerProvider("a")

                scheduler.schedule (
                    SimpleProc {
                        throw IllegalStateException("Washington DC is not a state.")
                    }
                )

                scheduler.waitForIdle()
            }
        }

        assertThat(e).hasMessageThat().contains("Washington DC is not a state.")
    }

    @Test
    fun canceling_thenReInvoking_givesNewScheduler() = runBlocking {
        val schedulerProvider = JvmSchedulerProvider(coroutineContext, 1)

        val scheduler = schedulerProvider("a")

        assertWithMessage(
            "While the scheduler is still active, the provider returns the same scheduler " +
                "for additional calls with the same arcId."
        ).that(schedulerProvider("a")).isSameInstanceAs(scheduler)

        scheduler.cancel()

        // Delay just a bit to ensure the `invokeOnCompletion` has been called for our scheduler
        delay(100)

        assertWithMessage(
            "After canceling the original scheduler, we should get a new one, even with the " +
                "same arcId."
        ).that(schedulerProvider("a")).isNotEqualTo(scheduler)

        schedulerProvider.cancelAll()
    }

    private class SimpleProc(block: () -> Unit) : Scheduler.Task.Processor(block)
}
