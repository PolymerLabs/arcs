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

typealias EntryHandler<MACHINE> = suspend (MACHINE).() -> Unit
typealias ErrorHandler<MACHINE> = suspend (MACHINE).(Exception) -> Unit

/**
 * [StateMachine] is an immutable directed graph of vertices representing states, and edges
 * representing transitions. Each [STATE] can have an associated [onEntry], [onExit], [onError]
 * handler and one or more [on] event transition handlers.
 *
 * [onEntry] handlers are invoked each time a [STATE] is entered, and [onExit] each time a state
 * is left. [onError] is invoked if an exception is thrown by a handler.
 *
 * [on] event transition handlers specify which [EVENT] they trigger on, and the new [STATE] to
 * transition to, effectively inserting an edge between the current state, and the new state
 * into the graph.
 *
 * To trigger a transition, you [trigger] the [EVENT] associated with that edge. Events are queued,
 * and then handlers are run in the following order:
 * 1) [onExit] is invoked for the current state
 * 2) If an exception occurs, [onError] is invoked and current and pending transitions are aborted
 * 3) [on] event transition handler is invoked, if an exception occurs, [onError] is invoked
 * and the transition and pending transitions are aborted.
 * 4) The current state is set to the transition's new state.
 * 5) The new state's [onEntry] handler is invoked.
 * 6) If an exception occurs, [onError] is invoked.
 * 7) Any [trigger] events that happen during these sequence are queued and processed as the last
 * step. [onError] flushes pending events.
 *
 * [StateMachine] represents the only legal transitions possible. Triggering events
 * which are not relevant for the current state results in an exception. Invalid state transition
 * attempts are not silently ignored.
 *
 * Loosely inspired by those used in gaming or protocol frameworks, like Fettle
 * [http://thehiflyer.github.io/Fettle/] but simplified for Arcs needs, and constructed via
 * idiomatic Kotlin type-safe builders.
 *
 * @param STATE usually an enum or sealed class representing possible states
 * @param EVENT usually an enum or sealed class representing possible event triggered transitions
 * @param MACHINE the subclass type that extends [StateMachine]
 * @property state the current/starting state of the machine.
 */
abstract class StateMachine<STATE, EVENT, MACHINE : StateMachine<STATE, EVENT, MACHINE>>(
    var state: STATE
) {
    private lateinit var states: Map<STATE, StateNode<STATE, EVENT, MACHINE>>
    private val eventQueue = mutableListOf<EVENT>()

    /** True if there are no pending events to process. */
    val idle = eventQueue.isEmpty()

    internal data class Transition<EVENT, STATE, MACHINE>(
        val nextState: STATE,
        val block: suspend (MACHINE).(STATE) -> Unit
    )

    internal data class StateNode<STATE, EVENT, MACHINE>(
        val entryHandler: EntryHandler<MACHINE>,
        val exitHandler: EntryHandler<MACHINE>,
        val errorHandler: ErrorHandler<MACHINE>,
        val eventHandlers: Map<EVENT, Transition<EVENT, STATE, MACHINE>>
    )

    /**
     * Triggers an event to be queued and processed immediately. This should only be called from
     * external code, never from state machine handlers.
     */
    suspend fun triggerImmediate(event: EVENT) {
        trigger(event)
        triggerInternal()
    }

    /**
     * Called by state machine handlers to queue an event to be processed after processing the
     * current event is finished processing.
     */
    protected suspend fun trigger(event: EVENT) {
        eventQueue += event
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun triggerInternal() {
        if (eventQueue.isEmpty()) {
            return
        }
        val event = eventQueue.removeAt(0)
        val stateNode = requireNotNull(states[state])
        val eventHandler = requireNotNull(stateNode.eventHandlers[event]) {
            "Illegal state transition $event while in state $state"
        }

        try {
            stateNode.exitHandler.invoke(this as MACHINE)
            eventHandler.block(this, eventHandler.nextState)
            transitionTo(eventHandler.nextState)
        } catch (e: Exception) {
            eventQueue.clear()
            stateNode.errorHandler.invoke(this as MACHINE, e)
        }

        triggerInternal()
    }

    /**
     * Invoked when transitioning to a new state. Verifies this is a valid transition, invokes
     * an entry handlers, forwarding exceptions to the error handlers.
     */
    @Suppress("UNCHECKED_CAST")
    protected suspend fun transitionTo(newState: STATE) {
        val destination = requireNotNull(states[newState]) {
            "$newState is not defined in the state machine."
        }

        state = newState
        try {
            destination.entryHandler.invoke(this as MACHINE)
        } catch (e: Exception) {
            eventQueue.clear()
            destination.errorHandler.invoke(this as MACHINE, e)
        }
    }

    /** Type-Safe builder for StateMachine. */
    inner class StateMachineBuilder {
        private var builderStates = mutableMapOf<STATE, StateNode<STATE, EVENT, MACHINE>>()

        /** Type-Safe builder for a given state. */
        inner class StateHandler(val state: STATE) {

            private var entryHandler: EntryHandler<MACHINE>? = null
            private var exitHandler: EntryHandler<MACHINE>? = null
            private var errorHandler: ErrorHandler<MACHINE>? = null
            private val eventHandlers: MutableMap<EVENT, Transition<EVENT, STATE, MACHINE>> =
                mutableMapOf()

            /** Invoked whenever this state is entered. */
            fun onEntry(handler: suspend (MACHINE).() -> Unit) {
                require(entryHandler == null) {
                    "$state already has entry handler. Only one entry handler allowed per state."
                }
                entryHandler = handler
            }

            /** Invoked whenever this state is exited. */
            fun onExit(handler: suspend (MACHINE).() -> Unit) {
                require(exitHandler == null) {
                    "$state already has exit handler. Only one exit handler allowed per state."
                }
                exitHandler = handler
            }

            /** Invoked whenever an exception occurs transitioning to this state. */
            fun onError(handler: suspend (MACHINE).(Exception) -> Unit) {
                require(errorHandler == null) {
                    "$state already has error handler. Only one error handler allowed per state."
                }
                errorHandler = handler
            }

            fun on(
                event: EVENT,
                nextState: STATE,
                handler: suspend (MACHINE).(state: STATE) -> Unit = {}
            ) {
                require(event !in eventHandlers) {
                    """$event already registered for $state. Only one event handler allowed per 
                       |state per event allowed.""".trimMargin()
                }
                eventHandlers[event] = Transition(nextState, handler)
            }

            internal fun build() = StateNode(
                entryHandler ?: {},
                exitHandler ?: {},
                errorHandler ?: {},
                eventHandlers
            )
        }

        /**
         * Defines a state in the machine and returns builder to register entry and error handlers.
         */
        fun state(newState: STATE, block: (StateHandler).() -> Unit) =
            StateHandler(newState).apply(block).apply {
                require(state !in builderStates) {
                    "State $state defined twice."
                }
                builderStates[state] = build()
            }

        internal fun build() {
            states = builderStates
        }
    }

    /** Creates and applies a type-safe builder for the state machine. */
    fun declareStateMachine(builder: (StateMachineBuilder).() -> Unit) =
        StateMachineBuilder().apply(builder).build()
}
