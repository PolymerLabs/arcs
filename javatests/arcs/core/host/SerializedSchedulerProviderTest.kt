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

import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.runTest
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.newFixedThreadPoolContext
import kotlinx.coroutines.newSingleThreadContext
import kotlinx.coroutines.withContext
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.util.concurrent.Executors

@RunWith(JUnit4::class)
class SerializedSchedulerProviderTest {
    @get:Rule
    val log = LogRule()

    @Test
    fun exclusive_jobs_on_scheduler() = runTest {
        val schedulerProvider = SimpleSchedulerProvider(Dispatchers.IO)

        val schedulerA = schedulerProvider("a")

        val parentJob = Job()
        val running = atomic(0)
        (1..10).map {
            val job = Job(parentJob)
            schedulerA.schedule(SimpleProc("t-$it") {
                val before = running.incrementAndGet()
                assertThat(before).isEqualTo(1)
                Thread.sleep(100)
                val after = running.decrementAndGet()
                assertThat(after).isEqualTo(0)
                job.complete()
            })
        }
        parentJob.complete()
        parentJob.join()
    }

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

        // Re-fetching the provider with the same arc-id gives the same scheduler.
        assertThat(schedulerProvider("a")).isSameInstanceAs(schedulerA)
        assertThat(schedulerProvider("b")).isSameInstanceAs(schedulerB)
        assertThat(schedulerProvider("c")).isSameInstanceAs(schedulerC)

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

        assertThat(schedulerAThread.await().id).isEqualTo(schedulerBThread.await().id)
        assertThat(schedulerBThread.await().id).isEqualTo(schedulerCThread.await().id)

        schedulerProvider.cancelAll()
    }

    @Test
    fun can_dispatch_from_dispatcher() = runTest {
        val coroutineContext = Executors.newSingleThreadExecutor().asCoroutineDispatcher()

        val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
        val schedulerA = schedulerProvider("a")

        val schedulerAThread = CompletableDeferred<Thread>(coroutineContext[Job.Key])
        val schedulerABThread = CompletableDeferred<Thread>(coroutineContext[Job.Key])

        withContext(schedulerA.asCoroutineDispatcher()) {
            schedulerA.schedule(
                SimpleProc("a") {
                    schedulerA.schedule(
                        SimpleProc("b") {
                            schedulerABThread.complete(Thread.currentThread())
                        }
                    )
                    schedulerAThread.complete(Thread.currentThread())
                }
            )
        }

        schedulerAThread.await()
        schedulerABThread.await()
    }

    @Test
   //@Ignore("This test is flaky, because the underlying dispatcher does not round-robin.")
    fun two_threads_threeSchedulers_roundRobin() = runTest {
        val coroutineContext = Executors.newFixedThreadPool(2).asCoroutineDispatcher()
        val schedulerProvider = SimpleSchedulerProvider(coroutineContext)

        val schedulerA = schedulerProvider("a")
        val schedulerB = schedulerProvider("b")
        val schedulerC = schedulerProvider("c")

        val schedulerAThread = CompletableDeferred<Thread>(coroutineContext[Job.Key])
        val schedulerBThread = CompletableDeferred<Thread>(coroutineContext[Job.Key])
        val schedulerCThread = CompletableDeferred<Thread>(coroutineContext[Job.Key])

        // A and C run on the same thread, but B runs on a different one.
        schedulerA.schedule(
            SimpleProc("a") { schedulerAThread.complete(Thread.currentThread()) }
        )
        schedulerB.schedule(
            SimpleProc("b") { schedulerBThread.complete(Thread.currentThread()) }
        )
        schedulerC.schedule(
            SimpleProc("c") { schedulerCThread.complete(Thread.currentThread()) }
        )
        println(schedulerAThread.await())
        println(schedulerBThread.await())
        println(schedulerCThread.await())
        assertThat(schedulerAThread.await()).isEqualTo(schedulerCThread.await())
        assertThat(schedulerBThread.await()).isNotEqualTo(schedulerCThread.await())
        assertThat(schedulerBThread.await()).isNotEqualTo(schedulerAThread.await())

        schedulerProvider.cancelAll()
    }

    @Test
    fun throwing_from_a_task_failsTheParentContext() = runTest {
        val e = assertSuspendingThrows(IllegalStateException::class) {
            withContext(coroutineContext) {
                val schedulerProvider = SimpleSchedulerProvider(coroutineContext)

                val scheduler = schedulerProvider("a")

                scheduler.schedule (
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
        val schedulerProvider = SimpleSchedulerProvider(coroutineContext)

        val scheduler = schedulerProvider("a")
        val schedulerJob = scheduler.scope.coroutineContext[Job.Key]

        val sameScheduler = schedulerProvider("a")
        assertWithMessage(
            "While the scheduler is still active, the provider returns the same scheduler " +
                "for additional calls with the same arcId."
        ).that(sameScheduler).isSameInstanceAs(scheduler)

        // Cancel the scheduler, and wait until its job has completed before trying to create
        // another scheduler with the same arcId.
        val schedulerJobCanceled = Job()
        schedulerJob?.invokeOnCompletion { schedulerJobCanceled.complete() }
        scheduler.cancel()

        schedulerJobCanceled.join()

        val newScheduler = schedulerProvider("a")
        assertWithMessage(
            "After canceling the original scheduler, we should get a new one, even with the " +
                "same arcId."
        ).that(newScheduler).isNotEqualTo(scheduler)

        schedulerProvider.cancelAll()
    }

    private class SimpleProc(val name: String, block: () -> Unit) : Scheduler.Task.Processor(block) {
        override fun toString() = "SimpleProc($name)"
    }
}
