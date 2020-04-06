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

import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout

/**
 * The [Scheduler] is responsible for scheduling the execution of a batch of [Task]s (known as an
 * [Agenda]), at a defined maximum [scheduleRateHz], where each agenda is limited to running within
 * the specified [agendaProcessingTimeoutMs] window.
 */
@Suppress("EXPERIMENTAL_API_USAGE")
class Scheduler(
    private val time: Time,
    context: CoroutineContext,
    private val agendaProcessingTimeoutMs: Long = DEFAULT_AGENDA_PROCESSING_TIMEOUT_MS,
    private val scheduleRateHz: Int = DEFAULT_SCHEDULE_RATE_HZ
) {
    private val log = TaggedLog { "Scheduler(${hashCode()})" }
    /* internal */
    val launches = atomic(0)
    /* internal */
    val loops = atomic(0)
    private var processingJob: Job? = null
    private val scope = CoroutineScope(context)
    private val isIdle = atomic(true)
    private val isPaused = atomic(false)
    private val agenda = atomic(Agenda())

    /** Schedule a single [Task] to be run as part of the next agenda. */
    fun schedule(task: Task) {
        agenda.update { it.addTask(task) }
        if (isIdle.value) scope.startProcessingJob()
    }

    /** Schedule some [Task]s to be run as part of the next agenda. */
    fun schedule(tasks: Iterable<Task>) {
        agenda.update { it.addTasks(tasks) }
        if (isIdle.value) scope.startProcessingJob()
    }

    /** Pause evaluation of the agenda. */
    fun pause() {
        isPaused.value = true
    }

    /** Resume evaluation of scheduled [Task]s in the agenda. */
    fun resume() {
        if (!isPaused.compareAndSet(expect = true, update = false)) return
        // If we were paused, we can re-start.
        scope.startProcessingJob()
    }

    /** Wait for the [Scheduler] to become idle. */
    suspend fun waitForIdle() {
        processingJob?.join()
    }

    /** Cancel the [CoroutineScope] belonging to this Scheduler. */
    fun cancel() {
        scope.cancel()
    }

    private fun CoroutineScope.startProcessingJob() {
        isIdle.value = false
        processingJob = launch {
            launches.incrementAndGet()

            var shallContinue = true
            while (shallContinue) {
                val startTime = time.currentTimeMillis
                shallContinue = withTimeout(agendaProcessingTimeoutMs) { executeAgenda() }
                val elapsed = time.currentTimeMillis - startTime

                if (shallContinue) {
                    loops.incrementAndGet()

                    // If the operation was super fast, let's delay a little bit to allow the
                    // thread to chill out.
                    val delayLength = scheduleRateHz.hzToMillisPerIteration() - elapsed
                    if (delayLength > 0) delay(delayLength)
                }
            }
        }.also { it.invokeOnCompletion { isIdle.value = true } }
    }

    /**
     * If the [Scheduler] isn't paused, executes the current [Agenda] and returns whether or not
     * another execution iteration is worth trying when complete.
     */
    private suspend fun executeAgenda(): Boolean {
        val timeoutHandler = { throwable: Throwable ->
            if (throwable is TimeoutCancellationException) {
                log.error(throwable) { "Scheduled tasks timed out." }
            }
        }

        // We're paused, so no need to do anything - and we should return false so the processing
        // job finishes without looping.
        if (isPaused.value) return false

        val agenda = agenda.getAndSet(Agenda())

        // There's nothing to do - return false so the processing job finishes without looping.
        if (agenda.isEmpty()) return false

        log.debug { "Processing agenda: $agenda" }

        // Process agenda
        agenda.forEach { task ->
            suspendCancellableCoroutine<Unit> { it.resume(task(), timeoutHandler) }
        }

        return true
    }

    private fun Int.hzToMillisPerIteration(): Long = ((1.0 / toDouble()) * 1000L).toLong()

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

        fun isEmpty(): Boolean =
            processors.isEmpty() && listenersByNamespace.isEmpty()

        override fun iterator(): Iterator<Task> = (processors + listenersByNamespace).iterator()
    }

    /**
     * [Task.Listener]s, collated by [Task.Listener.namespace].
     */
    private data class ListenersByNamespace(
        val listeners: Map<String, ListenersByName> = emptyMap()
    ) : Iterable<Task> {
        fun addListener(listener: Task.Listener): ListenersByNamespace {
            val listeners = (listeners[listener.namespace] ?: ListenersByName())
                .addListener(listener)

            return copy(listeners = this.listeners + (listener.namespace to listeners))
        }

        fun isEmpty(): Boolean = listeners.isEmpty()

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

    companion object {
        /**
         * The default maximum duration, in milliseconds, each iteration of scheduled tasks'
         * execution is allowed to take.
         */
        const val DEFAULT_AGENDA_PROCESSING_TIMEOUT_MS = 5000L

        /**
         * The default maximum rate at which iterations of agenda processing are allowed to operate
         * per second.
         */
        const val DEFAULT_SCHEDULE_RATE_HZ = 60
    }
}
