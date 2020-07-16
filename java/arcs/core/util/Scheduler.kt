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

import arcs.core.util.Scheduler.Companion.DEFAULT_AGENDA_PROCESSING_TIMEOUT_MS
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Runnable
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ConflatedBroadcastChannel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout

@Suppress("UNUSED_PARAMETER")
@Deprecated(
    "Time is no longer of the essence",
    ReplaceWith("Scheduler(context, agendaProcessingTimeoutMs)")
)
fun Scheduler(
    time: Time,
    context: CoroutineContext,
    agendaProcessingTimeoutMs: Long = DEFAULT_AGENDA_PROCESSING_TIMEOUT_MS
): Scheduler = Scheduler(context, agendaProcessingTimeoutMs)

/**
 * The [Scheduler] is responsible for scheduling the execution of a batch of [Task]s (known as an
 * [Agenda]).  Groups of [Task]s sent to [schedule] are guaranteed to be run in the order in which
 * they were received, while the group's order itself is defined by a natural ordering of
 * [Processor]s followed by grouped [Listener]s.
 */
@Suppress("EXPERIMENTAL_API_USAGE", "MemberVisibilityCanBePrivate")
class Scheduler(
    context: CoroutineContext,
    private val agendaProcessingTimeoutMs: Long = DEFAULT_AGENDA_PROCESSING_TIMEOUT_MS
) {
    private val log = TaggedLog { "Scheduler" }
    /* internal */
    val launches = atomic(0)
    val scope = CoroutineScope(context)

    private val agendasInFlight = atomic(0)
    private val agendaChannel = Channel<Agenda>(Channel.UNLIMITED)
    private val pausedChannel = ConflatedBroadcastChannel(false)
    private val idlenessChannel = ConflatedBroadcastChannel(true)

    private val dispatcher: CoroutineDispatcher by lazy(LazyThreadSafetyMode.SYNCHRONIZED) {
        Dispatcher(this)
    }

    /**
     * Flow of booleans indicating when the Scheduler has entered (`true`) or exited (`false`) and
     * idle state.
     */
    val idlenessFlow: Flow<Boolean> = idlenessChannel.asFlow()

    init {
        // Consume the agenda channel:
        // 1. Wait until the latest pause-value is false,
        // 2. Notify the idleness channel that we're busy,
        // 3. Do the work
        // 4. Notify the idleness channel that we're not busy.
        agendaChannel.consumeAsFlow()
            .onEach { agenda ->
                // TODO(jasonwyatt): This waiting until not-paused thing would be cleaner with
                //  something along the lines of atomicBoolean.waitUntilTrue() (would need to be
                //  created).
                pausedChannel.asFlow().filter { !it }.first()
                launches.incrementAndGet()

                try {
                    withTimeout(agendaProcessingTimeoutMs) { executeAgenda(agenda) }
                } finally {
                    agenda.listenersByNamespace.clear()
                    val agendasLeft = agendasInFlight.getAndDecrement()
                    if (agendasLeft == 1) {
                        idlenessChannel.send(true)
                    }
                }
            }
            .launchIn(scope)
    }

    /** Schedule a single [Task] to be run as part of the next agenda. */
    fun schedule(task: Task) {
        val agendasInFlight = agendasInFlight.getAndIncrement()
        if (agendasInFlight == 0) {
            idlenessChannel.offer(false)
        }
        agendaChannel.offer(Agenda().addTask(task))
    }

    /** Schedule some [Task]s to be run as part of the next agenda. */
    fun schedule(tasks: Iterable<Task>) {
        val agendasInFlight = agendasInFlight.getAndIncrement()
        if (agendasInFlight == 0) {
            idlenessChannel.offer(false)
        }
        agendaChannel.offer(Agenda().addTasks(tasks))
    }

    /** Pause evaluation of the agenda. */
    fun pause() {
        pausedChannel.offer(true)
    }

    /** Resume evaluation of scheduled [Task]s in the agenda. */
    fun resume() {
        pausedChannel.offer(false)
    }

    /** Wait for the [Scheduler] to become idle. */
    /* internal */
    suspend fun waitForIdle() {
        idlenessFlow.debounce(50).filter { it }.first()
    }

    /** Returns a wrapper of this [Scheduler] capable of serving as a [CoroutineDispatcher]. */
    fun asCoroutineDispatcher(): CoroutineDispatcher = dispatcher

    /** Cancel the [CoroutineScope] belonging to this Scheduler. */
    fun cancel() {
        scope.cancel()
    }

    private suspend fun executeAgenda(agenda: Agenda) {
        val timeoutHandler = { throwable: Throwable ->
            if (throwable is TimeoutCancellationException) {
                // TODO(b/160251910): Make logging detail more cleanly conditional.
                log.debug(throwable) { "Scheduled tasks timed out." }
                log.info { "Scheduled tasks timed out." }
            }
        }
        log.debug { "Processing agenda: $agenda" }

        agenda.forEach { task ->
            suspendCancellableCoroutine<Unit> {
                log.debug { "Starting $task" }
                try {
                    currentDispatcherThreadLocal.set(dispatcher)
                    it.resume(task(), timeoutHandler)
                } finally {
                    currentDispatcherThreadLocal.set(null)
                }
                log.debug { "Finished $task" }
            }
        }
    }

    sealed class Task(private val block: () -> Unit) {
        /**
         * [Task]s will be invoked by the [Scheduler] when their turn has arrived.
         */
        operator fun invoke() = block()

        /**
         * A [Processor] [Task] is responsible for computing data ahead of the execution of any
         * [Listener] tasks.
         *
         * For example: [StorageProxy]'s usage of the [Scheduler] schedules [Processor] [Task]s when
         * a [ProxyMessage] comes in from the [Store] - these [Processor] tasks are responsible for
         * updating the [StorageProxy]'s local [CrdtModel].
         */
        abstract class Processor(block: () -> Unit) : Task(block)

        /**
         * [Listener] [Task]s are invoked after all scheduled [Processor] tasks have finished. The
         * idea is that they are meant to react to changes that [Processor] tasks have triggered.
         */
        abstract class Listener(
            /**
             * In situations where [name]s can collide, it's helpful to have an additional dimension.
             *
             * For example: [StorageProxy]'s usage of [Scheduler] uses a handle's owning Particle's
             * name as the [namespace].
             */
            val namespace: String,
            /**
             * The name of the [Listener].
             *
             * For example: [StorageProxy]'s usage of [Scheduler] uses a handle's name as the
             * [Listener]'s [name].
             */
            val name: String,
            block: () -> Unit
        ) : Task(block)
    }

    /**
     * Agenda of [Task]s to be executed by the [Scheduler] on a pass.
     *
     * The [Scheduler] should execute all [processors] before executing [listeners] on a
     * namespace-by-namespace basis.
     */
    private data class Agenda(
        /**
         * Scheduled [Task.Processor]s.
         */
        val processors: List<Task.Processor> = emptyList(),
        /**
         * Scheduled [Task.Listener]s, collated by [Task.Listener.namespace].
         */
        val listenersByNamespace: ListenersByNamespace = ListenersByNamespace()
    ) : Iterable<Task> {
        fun addTasks(tasks: Iterable<Task>): Agenda =
            tasks.fold(this) { agenda, task -> agenda.addTask(task) }

        fun addTask(task: Task): Agenda = when (task) {
            is Task.Processor -> addProcessor(task)
            is Task.Listener -> addListener(task)
        }

        fun addProcessor(processor: Task.Processor): Agenda =
            copy(processors = processors + processor)

        fun addListener(listener: Task.Listener): Agenda =
            copy(listenersByNamespace = listenersByNamespace.addListener(listener))

        override fun iterator(): Iterator<Task> = (processors + listenersByNamespace).iterator()
    }

    /**
     * [Task.Listener]s, collated by [Task.Listener.namespace].
     */
    private data class ListenersByNamespace(
        val listeners: MutableMap<String, ListenersByName> = mutableMapOf()
    ) : Iterable<Task> {
        fun addListener(listener: Task.Listener): ListenersByNamespace {
            val listeners = (listeners[listener.namespace] ?: ListenersByName())
                .addListener(listener)

            return copy(
                listeners = (this.listeners + (listener.namespace to listeners)).toMutableMap()
            )
        }

        fun clear() = listeners.clear()

        override fun iterator(): Iterator<Task> = listeners.values.flatten().iterator()
    }

    /**
     * [Task.Listener]s, collated by [Task.Listener.name].
     */
    private data class ListenersByName(
        val listeners: Map<String, List<Task.Listener>> = emptyMap()
    ) : Iterable<Task> {
        fun addListener(listener: Task.Listener): ListenersByName {
            val resultList = (listeners[listener.name] ?: emptyList()) + listener
            return copy(listeners = listeners + (listener.name to resultList))
        }

        override fun iterator(): Iterator<Task> = listeners.values.flatten().iterator()
    }

    /**
     * Implementation of a [CoroutineDispatcher] which can be used by code unaware of the [Scheduler]
     * itself to run operations as listeners on the scheduler.
     *
     * For example: [Handle.dispatcher] returns an instance of [Dispatcher] so that code outside of
     * particle-context can run operations on the scheduler to access the handle data safely and
     * correctly.
     */
    private class Dispatcher(private val scheduler: Scheduler) : CoroutineDispatcher() {
        override fun dispatch(context: CoroutineContext, block: Runnable) =
            scheduler.schedule(DispatchedTask(block::run))

        private class DispatchedTask(
            block: () -> Unit
        ) : Scheduler.Task.Listener("dispatcher", "non-particle", block)
    }

    private val currentDispatcherThreadLocal = CommonThreadLocal<CoroutineDispatcher?>()

    /** The [Scheduler] dispatcher that the current thread is running in, or null. */
    val currentDispatcher get() = currentDispatcherThreadLocal.get()

    /** Returns true if the current thread is executing within the given [dispatcher]. */
    fun currentlyRunningInSchedulerDispatcher(dispatcher: CoroutineDispatcher): Boolean {
        return currentDispatcher === dispatcher
    }

    companion object {
        /**
         * The default maximum duration, in milliseconds, each iteration of scheduled tasks'
         * execution is allowed to take.
         */
        const val DEFAULT_AGENDA_PROCESSING_TIMEOUT_MS = 5000L
    }
}

@Suppress("FunctionName")
@Deprecated(
    "Use scheduler.asCoroutineDispatcher() instead",
    ReplaceWith("scheduler.asCoroutineDispatcher()")
)
fun SchedulerDispatcher(scheduler: Scheduler): CoroutineDispatcher =
    scheduler.asCoroutineDispatcher()
