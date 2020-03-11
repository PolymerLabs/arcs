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
package arcs.android.storage.ttl

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import arcs.core.util.TaggedLog

/**
 * Implementation of a [Worker] which performs periodic scan of storage and deletes expired data.
 */
class PeriodicCleanupTask(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    private val log = TaggedLog { "PeriodCleanupTask" }
    init { log.debug { "Created." } }

    override fun doWork(): Result {
        log.debug { "Running." }
        // TODO (b/146012246): find and delete expired entities.

        // Indicate whether the task finished successfully with the Result
        return Result.success()
    }

    companion object {
        /** Unique name of the worker, used to enqueue the periodic task in [WorkManager]. */
        const val WORKER_TAG = "PeriodicCleanupTask"
    }
}
