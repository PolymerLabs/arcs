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

import arcs.core.entity.Handle
import arcs.core.host.ParticleEvent.CreateEvent
import arcs.core.host.ParticleEvent.FailedEvent
import arcs.core.host.ParticleEvent.MaxFailedEvent
import arcs.core.host.ParticleEvent.ReadyEvent
import arcs.core.host.ParticleEvent.StartEvent
import arcs.core.host.ParticleEvent.StopEvent
import arcs.core.host.ParticleState.Created
import arcs.core.host.ParticleState.Failed
import arcs.core.host.ParticleState.Failed_NeverStarted
import arcs.core.host.ParticleState.Instantiated
import arcs.core.host.ParticleState.MaxFailed
import arcs.core.host.ParticleState.Ready
import arcs.core.host.ParticleState.Started
import arcs.core.host.ParticleState.Stopped
import arcs.core.host.api.Particle
import arcs.core.util.StateMachine
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

enum class ParticleEvent {
    StartEvent,
    StopEvent,
    FailedEvent,
    MaxFailedEvent,
    CreateEvent,
    ReadyEvent
}

/**
 * A [StateMachine] for [Particle] lifecycle. This class defines what are the valid states of the
 * particle, what to do when transitioning into each state, and what the valid transitions are.
 */
open class ParticleStateMachine constructor(
    currentState: ParticleState
) : StateMachine<ParticleState, ParticleEvent, ParticleContext>(currentState) {
    init {
        declareStateMachine {
            state(Instantiated) {
                onEntry {
                    particle.onCreate()
                    trigger(CreateEvent)
                }

                onError(::markParticleAsFailed)

                on(StartEvent, Created)
                on(FailedEvent, Failed_NeverStarted)
            }

            state(Started) {
                // Starting while already started will stop, this occurs during crash recovery
                on(StartEvent, Stopped) {
                    // Trigger a restart after moving to Stopped state
                    trigger(StartEvent)
                }
                on(StopEvent, Stopped)
            }

            state(Stopped) {
                onEntry {
                    try {
                        particle.onShutdown()
                    } finally {
                        particle.handles.reset()
                    }
                }

                onError(::markParticleAsFailed)

                on(StartEvent, Created)
                on(FailedEvent, Failed)
            }

            state(Created) {
                onEntry {
                    val waitingSet = mutableSetOf<Handle>()
                    waitingSet.addAll(handles.values)

                    handles.values.forEach { handle ->
                        handle.onReady {
                            waitingSet.remove(handle)
                            if (waitingSet.isEmpty()) {
                                GlobalScope.launch {
                                    triggerImmediate(ReadyEvent)
                                }
                            }
                        }
                    }
                }

                onError(::markParticleAsFailed)

                on(ReadyEvent, Ready)
                on(FailedEvent, Failed)
            }

            state(Ready) {
                onEntry {
                    particle.onReady()
                    trigger(StartEvent)
                }

                onError(::markParticleAsFailed)

                on(FailedEvent, Failed)
                on(StartEvent, Started)
            }

            state(Failed) {
                onEntry(checkForMaxFailures)
                onError {
                    trigger(MaxFailedEvent)
                }
                on(MaxFailedEvent, MaxFailed)
                on(StartEvent, Created)
                on(StopEvent, Failed)
            }

            state(Failed_NeverStarted) {
                onEntry(checkForMaxFailures)
                onError {
                    trigger(MaxFailedEvent)
                }
                on(StartEvent, Instantiated)
                on(MaxFailedEvent, MaxFailed)
                on(StopEvent, Failed_NeverStarted)
            }

            state(MaxFailed) {
                // There is no escape
            }
        }
    }

    private val checkForMaxFailures: suspend (ParticleContext).() -> Unit = {
        consecutiveFailureCount++
        if (consecutiveFailureCount >= MAX_CONSECUTIVE_FAILURES) {
            // Throwing clears the pending event queue
            throw MaxFailuresException()
        }
    }

    class MaxFailuresException : IllegalStateException()

    companion object {
        /**
         * Move to [ParticleState.Failed] if this particle had previously successfully invoked
         * [Particle.onCreate()], else move to [ParticleState.Failed_NeverStarted]. Increments
         * consecutive failure count, and if it reaches maximum, transitions to
         * [ParticleState.MaxFailed].
         */
        private suspend fun markParticleAsFailed(
            particleContext: ParticleContext,
            exception: Exception
        ) = particleContext.run {
            trigger(FailedEvent)
        }
    }
}
