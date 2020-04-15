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
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.storage.database.DatabaseManager
import arcs.core.util.TaggedLog
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Implementation of a [Worker] which performs periodic scan of storage and deletes expired data.
 */
class PeriodicCleanupTask(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    private val log = TaggedLog { "PeriodCleanupTask" }
    private val databaseManager: DatabaseManager = AndroidSqliteDatabaseManager(appContext)
    private val job = Job() + Dispatchers.IO + CoroutineName("PeriodicCleanupTask")
    init { log.debug { "Created." } }

    override fun doWork(): Result {
        log.debug { "Running." }
        CoroutineScope(job).launch {
            databaseManager.removeExpiredEntities()
        }
        log.debug { "Success." }
        // Indicate whether the task finished successfully with the Result
        return Result.success()
    }

    companion object {
        /** Unique name of the worker, used to enqueue the periodic task in [WorkManager]. */
        const val WORKER_TAG = "PeriodicCleanupTask"
    }
}
