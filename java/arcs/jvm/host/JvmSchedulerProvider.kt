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

import arcs.core.host.SchedulerProvider
import arcs.core.util.Scheduler
import arcs.jvm.util.JvmTime
import java.util.concurrent.Executors
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher

/**
 * Implementation of a [SchedulerProvider] for the Java Virtual Machine (including Android).
 *
 * A new [Scheduler] is returned for each unique Arc ID encountered, and each [Scheduler] will be
 * associated with a single-threaded [CoroutineDispatcher]. However, those dispatchers will be
 * allocated to schedulers from a finite pool of dispatchers in a round-robin fashion - the size
 * of that pool is defined by [maxThreadCount].
 *
 * Each [ArcHost] should generally use a separate [JvmSchedulerProvider].
 */
class JvmSchedulerProvider(
    private val baseCoroutineContext: CoroutineContext,
    private val maxThreadCount: Int =
        maxOf(1, Runtime.getRuntime().availableProcessors() / 2),
    private val threadPriority: Int = Thread.NORM_PRIORITY
) : SchedulerProvider {
    private val dispatchers = mutableListOf<CoroutineDispatcher>()
    private val schedulersByArcId = mutableMapOf<String, Scheduler>()

    @Synchronized
    override fun invoke(arcId: String): Scheduler {
        schedulersByArcId[arcId]?.let { return it }

        val dispatcher = if (dispatchers.size == maxThreadCount) {
            dispatchers[schedulersByArcId.size % maxThreadCount]
        } else {
            Executors
                .newSingleThreadExecutor {
                    Thread(it).apply {
                        priority = threadPriority
                    }
                }
                .asCoroutineDispatcher()
                .also { dispatchers.add(it) }
        }

        val schedulerParentJob = Job(baseCoroutineContext[Job])
        schedulerParentJob.invokeOnCompletion {
            synchronized(this@JvmSchedulerProvider) {
                schedulersByArcId.remove(arcId)
            }
        }

        val schedulerContext = baseCoroutineContext +
            schedulerParentJob +
            CoroutineName("Scheduler::$arcId") +
            dispatcher

        return Scheduler(JvmTime, schedulerContext).also { schedulersByArcId[arcId] = it }
    }

    @Synchronized
    fun cancelAll() {
        schedulersByArcId.values.toList().forEach { it.cancel() }
    }
}
