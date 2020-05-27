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

import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.yield
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.util.concurrent.Executors

@RunWith(JUnit4::class)
class SchedulerTest {
    @get:Rule
    val log = LogRule()

    private val singleThreadDispatcher = Executors.newSingleThreadExecutor().asCoroutineDispatcher()

    @Test
    fun simpleTest() = runBlocking {
        val scheduler = Scheduler(JvmTime, coroutineContext + singleThreadDispatcher)
        val stateHolder = StateHolder()

        val processors = (0 until 100).map {
            createProcess(it, stateHolder)
        }
        val listeners = (0 until 100).map {
            createListener(it, "foo", "FooListener", stateHolder)
        }

        scheduler.schedule(processors + listeners)
        scheduler.waitForIdle()

        assertThat(scheduler.launches.value).isEqualTo(1)
        assertThat(scheduler.loops.value).isEqualTo(1)

        assertWithMessage("Agenda runs Processors then Listeners, where each batch is in-order.")
            .that(stateHolder.calls)
            .containsExactlyElementsIn(
                (0 until 100).map { it to "Processor" } +
                    (0 until 100).map { it to "Listener(foo, FooListener)" }
            )
            .inOrder()
    }

    @Ignore("b/157268079 - Deflake")
    @Test
    fun schedulingWhileProcessing_triggersAnotherLoop_notAnotherLaunch() = runBlocking {
        val scheduler = Scheduler(JvmTime, coroutineContext + singleThreadDispatcher)
        val stateHolder = StateHolder()

        val longProcessor = TestProcessor {
            Thread.sleep(300)
            stateHolder.calls += 0 to "LongSleep"
        }

        val followupProcessor = TestProcessor {
            stateHolder.calls += 1 to "Followup"
        }

        scheduler.schedule(longProcessor)
        Thread.sleep(100) // let the first one start.
        scheduler.schedule(followupProcessor)

        scheduler.waitForIdle()

        assertWithMessage("There should be only one coroutine launch")
            .that(scheduler.launches.value)
            .isEqualTo(1)
        assertWithMessage("The coroutine launch should've looped twice")
            .that(scheduler.loops.value)
            .isEqualTo(2)
        assertThat(stateHolder.calls)
            .containsExactly(
                0 to "LongSleep",
                1 to "Followup"
            )
            .inOrder()
    }

    @Test
    fun tasks_schedulingOtherTasks_dontDeadlock() = runBlocking {
        val scheduler = Scheduler(JvmTime, coroutineContext + singleThreadDispatcher)
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

        assertWithMessage("There should have been a loop for each processor")
            .that(scheduler.loops.value)
            .isEqualTo(processorsToCreate)
        assertThat(processorsLeftToCreate).isEqualTo(0)
        assertThat(stateHolder.calls).hasSize(processorsToCreate)
    }

    @Test
    fun tasks_canTimeout() = runBlocking<Unit> {
        val scheduler = Scheduler(
            JvmTime,
            coroutineContext + singleThreadDispatcher,
            agendaProcessingTimeoutMs = 100
        )

        var firstProcRan = true
        var secondProcRan = false

        scheduler.schedule(
            listOf(
                TestProcessor {
                    firstProcRan = true
                    Thread.sleep(200)
                },
                TestProcessor {
                    secondProcRan = true
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
    }

    @Test
    fun pause_pausesExecution_resume_resumesExecution() = runBlocking {
        val scheduler = Scheduler(JvmTime, coroutineContext + singleThreadDispatcher)

        var firstCalled = false
        var secondCalled = false

        val first = TestProcessor {
            firstCalled = true
            scheduler.pause()
        }
        val second = TestProcessor {
            secondCalled = true
        }

        scheduler.schedule(first)
        Thread.sleep(50) // Just to ensure that we launched the agenda-processing coroutine
        // At this point, the scheduler should be paused, so `second` shouldn't get run.
        scheduler.schedule(second)
        scheduler.waitForIdle()

        assertWithMessage("First should've been called")
            .that(firstCalled).isTrue()
        assertWithMessage("Second shouldn't have been called")
            .that(secondCalled).isFalse()

        // Now let's resume.
        scheduler.resume()
        scheduler.waitForIdle()

        assertWithMessage("Second should have been called after resume")
            .that(secondCalled).isTrue()
    }

    @Test
    fun executesListenersByNamespaceAndName() = runBlocking {
        val scheduler = Scheduler(JvmTime, coroutineContext + singleThreadDispatcher)
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

    private class TestProcessor(block: () -> Unit) : Scheduler.Task.Processor(block)
    private class TestListener(
        namespace: String,
        name: String,
        block: () -> Unit
    ) : Scheduler.Task.Listener(namespace, name, block)
}
