package arcs.core.util

import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.StateMachineTest.TestEvent.*
import arcs.core.util.StateMachineTest.TestState.Before
import arcs.core.util.StateMachineTest.TestState.TestEventQueue
import arcs.core.util.StateMachineTest.TestState.TestEventQueue2
import arcs.core.util.StateMachineTest.TestState.TestEventQueue3
import arcs.core.util.StateMachineTest.TestState.TestExceptionInEntry
import arcs.core.util.StateMachineTest.TestState.TestExceptionInExit
import arcs.core.util.StateMachineTest.TestState.TestExceptionInTransition
import arcs.core.util.StateMachineTest.TestState.TestIllegalTransition
import arcs.core.util.StateMachineTest.TestState.TestState
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


/** Tests for [StateMachine]. */
@RunWith(JUnit4::class)
class StateMachineTest {

    @Test
    fun testSimpleTransitions() = runBlockingTest {
        val machine = TestMachine()
        assertThat(machine.state).isEqualTo(Before)
        machine.triggerImmediate(TestEntryAndExitEvent)
        assertThat(machine.state).isEqualTo(TestState)
        assertThat(machine.actionsHandled).containsExactly(
            exit(Before),
            transition(Before, TestState),
            enter(TestState)
        )
        assertThat(machine.idle).isTrue()
    }

    @Test
    fun testErrorDuringExit() = runBlockingTest {
        val machine = TestMachine(TestExceptionInExit)
        machine.triggerImmediate(TestEntryAndExitEvent)
        assertThat(machine.state).isEqualTo(TestExceptionInExit)
        assertThat(machine.actionsHandled).containsExactly(
            exit(TestExceptionInExit),
            error(TestExceptionInExit, "Boom!")
        )
        assertThat(machine.idle).isTrue()
    }

    @Test
    fun testTriggerQueue() = runBlockingTest {
        val machine = TestMachine(TestExceptionInExit)
        machine.triggerImmediate(TestEntryAndExitEvent)
        assertThat(machine.state).isEqualTo(TestExceptionInExit)
        assertThat(machine.actionsHandled).containsExactly(
            exit(TestExceptionInExit),
            error(TestExceptionInExit, "Boom!")
        )
        assertThat(machine.idle).isTrue()
    }

    @Test
    fun testErrorDuringTransition() = runBlockingTest {
        val machine = TestMachine(TestExceptionInTransition)
        machine.triggerImmediate(TestEntryAndExitEvent)
        assertThat(machine.state).isEqualTo(TestExceptionInTransition)
        assertThat(machine.actionsHandled).containsExactly(
            exit(TestExceptionInTransition),
            transition(TestExceptionInTransition, TestState),
            error(TestExceptionInTransition, "Boom!")
        )
        assertThat(machine.idle).isTrue()
    }

    @Test
    fun testErrorDuringEntry() = runBlockingTest {
        val machine = TestMachine()
        machine.triggerImmediate(TestExceptionInEntryEvent)
        assertThat(machine.state).isEqualTo(TestExceptionInEntry)
        assertThat(machine.actionsHandled).containsExactly(
            exit(Before),
            transition(Before, TestExceptionInEntry),
            enter(TestExceptionInEntry),
            error(TestExceptionInEntry, "Boom!")
        )
        assertThat(machine.idle).isTrue()
    }

    @Test
    fun testEventQueue() = runBlockingTest {
        val machine = TestMachine(TestEventQueue)
        machine.triggerImmediate(TestEventQueueEvent)
        assertThat(machine.state).isEqualTo(TestEventQueue3)
        assertThat(machine.actionsHandled).containsExactly(
            exit(TestEventQueue),
            transition(TestEventQueue, TestEventQueue2),
            enter(TestEventQueue2),
            exit(TestEventQueue2),
            transition(TestEventQueue2, TestEventQueue3),
            enter(TestEventQueue3),
            exit(TestEventQueue3),
            transition(TestEventQueue3, TestEventQueue3),
            enter(TestEventQueue3),
            exit(TestEventQueue3),
            transition(TestEventQueue3, TestEventQueue3),
            enter(TestEventQueue3)
        )
        assertThat(machine.idle).isTrue()
    }

    @Test
    fun testIllegalTransition() = runBlockingTest {
        val machine = TestMachine(TestEventQueue)
        assertSuspendingThrows(IllegalArgumentException::class) {
            machine.triggerImmediate(TestEntryAndExitEvent)
        }
    }



    @Test
    fun testIllegalMachines() = runBlockingTest {
        assertSuspendingThrows(IllegalArgumentException::class) {
            IllegalMachineDupState()
        }
        assertSuspendingThrows(IllegalArgumentException::class) {
            IllegalMachineDupEntry()
        }
        assertSuspendingThrows(IllegalArgumentException::class) {
            IllegalMachineDupExit()
        }
        assertSuspendingThrows(IllegalArgumentException::class) {
            IllegalMachineDupError()
        }
        assertSuspendingThrows(IllegalArgumentException::class) {
            IllegalMachineDupTransition()
        }
    }

    enum class TestEvent {
        TestEntryAndExitEvent,
        TestExceptionInEntryEvent,
        TestEventQueueEvent,
        TestEventQueueEvent2,
        TestEventQueueEvent3,
        TestEventQueueEvent4,
        ShouldBeDiscarded
    }

    enum class TestState {
        Before,
        TestExceptionInExit,
        TestExceptionInTransition,
        TestExceptionInEntry,
        TestEventQueue,
        TestEventQueue2,
        TestEventQueue3,
        TestState,
        TestIllegalTransition,
    }

    class TestMachine(
        initial: TestState = Before
    ) : StateMachine<TestState, TestEvent, TestMachine>(initial) {
        val actionsHandled = mutableListOf<Any>()

        private suspend fun entered(machine: (TestMachine)) {
            actionsHandled += enter(machine.state)
        }

        private suspend fun exited(machine: (TestMachine)) {
            actionsHandled += exit(machine.state)
        }

        private suspend fun errored(machine: (TestMachine), exception: Exception) {
            actionsHandled += error(machine.state, exception.message.toString())
        }

        private suspend fun transitioned(machine: (TestMachine), nextState: TestState) {
            actionsHandled += transition(machine.state, nextState)
        }

        init {
            declareStateMachine {
                state(Before) {
                    onEntry(::entered)
                    on(TestEntryAndExitEvent, TestState, ::transitioned)
                    on(TestExceptionInEntryEvent, TestExceptionInEntry, ::transitioned)
                    onError(::errored)
                    onExit(::exited)
                }

                state(TestState) {
                    onEntry(::entered)
                    onError(::errored)
                    onExit(::exited)
                }

                state(TestExceptionInExit) {
                    onExit {
                        exited(this)
                        trigger(ShouldBeDiscarded)
                        throw IllegalStateException("Boom!")
                    }

                    onError(::errored)
                    on(TestEntryAndExitEvent, TestState, ::transitioned)
                }

                state(TestExceptionInTransition) {
                    onExit {
                        exited(this)
                        trigger(ShouldBeDiscarded)
                    }

                    onError(::errored)
                    on(TestEntryAndExitEvent, TestState) {
                        transitioned(this, TestState)
                        trigger(ShouldBeDiscarded)
                        throw IllegalStateException("Boom!")
                    }
                }

                state(TestExceptionInEntry) {
                    onEntry {
                        entered(this)
                        trigger(ShouldBeDiscarded)
                        throw IllegalStateException("Boom!")
                    }
                    onExit {
                        exited(this)
                        trigger(ShouldBeDiscarded)
                    }

                    onError(::errored)
                }

                state(TestEventQueue) {
                    onExit {
                        exited(this)
                        trigger(TestEventQueueEvent2)
                    }

                    onError(::errored)

                    on(TestEventQueueEvent, TestEventQueue2) { newState ->
                        transitioned(this, newState)
                        trigger(TestEventQueueEvent3)
                    }
                }

                state(TestEventQueue2) {
                    onEntry {
                        entered(this)
                        trigger(TestEventQueueEvent4)
                    }

                    onExit(::exited)

                    on(TestEventQueueEvent2, TestEventQueue3, ::transitioned)
                    on(TestEventQueueEvent3, TestEventQueue3, ::transitioned)
                    on(TestEventQueueEvent4, TestEventQueue3, ::transitioned)
                }

                state(TestEventQueue3) {
                    onEntry(::entered)
                    onExit(::exited)
                    on(TestEventQueueEvent3, TestEventQueue3, ::transitioned)
                    on(TestEventQueueEvent4, TestEventQueue3, ::transitioned)
                }

                state(TestIllegalTransition) {

                }
            }
        }
    }

    class IllegalMachineDupState
        : StateMachine<TestState, TestEvent, IllegalMachineDupState>(Before) {
        init {
            declareStateMachine {
                state(TestState.Before) {

                }

                state(TestState.Before) {

                }
            }
        }
    }

    class IllegalMachineDupEntry
        : StateMachine<TestState, TestEvent, IllegalMachineDupState>(Before) {
        init {
            declareStateMachine {
                state(TestState.Before) {
                    onEntry {

                    }

                    onEntry {

                    }
                }
            }
        }
    }

    class IllegalMachineDupExit
        : StateMachine<TestState, TestEvent, IllegalMachineDupState>(Before) {
        init {
            declareStateMachine {
                state(TestState.Before) {
                    onExit {

                    }

                    onExit {

                    }
                }
            }
        }
    }

    class IllegalMachineDupError
        : StateMachine<TestState, TestEvent, IllegalMachineDupState>(Before) {
        init {
            declareStateMachine {
                state(TestState.Before) {
                    onError {

                    }

                    onError {

                    }
                }
            }
        }
    }

    class IllegalMachineDupTransition
        : StateMachine<TestState, TestEvent, IllegalMachineDupState>(Before) {
        init {
            declareStateMachine {
                state(TestState.Before) {
                    on(TestEvent.TestEntryAndExitEvent, TestState.Before) {

                    }
                    on(TestEvent.TestEntryAndExitEvent, TestState.Before) {

                    }
                }
            }
        }
    }
}

fun enter(state: StateMachineTest.TestState) = "enter:${state.name}"
fun exit(state: StateMachineTest.TestState) = "exit:${state.name}"
fun error(state: StateMachineTest.TestState, msg: String) = "error:${state.name}:$msg"
fun transition(from: StateMachineTest.TestState, to: StateMachineTest.TestState) =
    "transition:${from.name}:${to.name}"
