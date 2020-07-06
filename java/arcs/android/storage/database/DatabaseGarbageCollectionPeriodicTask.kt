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
package arcs.android.storage.database

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.util.TaggedLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

/**
 * Implementation of a [Worker] which performs periodic scan of storage and deletes unused data.
 */
class DatabaseGarbageCollectionPeriodicTask(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    private val log = TaggedLog { WORKER_TAG }
    init { log.debug { "Created." } }

    override fun doWork(): Result = runBlocking {
        log.debug { "Running." }
        // Use the DatabaseDriverProvider instance of the databaseManager to make sure changes by
        // GC are propagated to listening Stores.
        val databaseManager = DatabaseDriverProvider.manager
        databaseManager.runGarbageCollection().join()
        log.debug { "Success." }
        // Indicate whether the task finished successfully with the Result
        Result.success()
    }

    companion object {
        /** Unique name of the worker, used to enqueue the periodic task in [WorkManager]. */
        const val WORKER_TAG = "DatabaseGarbageCollectionPeriodicTask"
    }
}
