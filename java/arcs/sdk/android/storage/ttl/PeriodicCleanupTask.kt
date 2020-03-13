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
package arcs.sdk.android.storage.ttl

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import arcs.android.storage.ttl.JvmRemovalManager
import arcs.core.data.CollectionType
import arcs.core.data.EntitySchemaProviderType
import arcs.core.data.EntityType
import arcs.core.data.SingletonType
import arcs.core.storage.DriverFactory
import arcs.core.storage.handle.HandleManager
import arcs.core.util.TaggedLog
import arcs.jvm.util.JvmTime
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Implementation of a [Worker] which performs periodic scan of storage and deletes expired data.
 */
class PeriodicCleanupTask(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    // TODO: initialize to AndroidHandleManager and make private and non-nullable
    /*private val */ var handleManager = HandleManager(JvmTime)
    private val removalManager = JvmRemovalManager()

    /** The local [CoroutineContext]. */
    // TODO: initialize properly!!!
    val coroutineContext: CoroutineContext = EmptyCoroutineContext

    private val log = TaggedLog { "PeriodCleanupTask" }

    init { log.debug { "Created." } }

    override fun doWork(): Result {
        log.debug { "Running." }

        CoroutineScope(coroutineContext).launch {
            cleanAllExpired()
        }

        // Indicate whether the task finished successfully with the Result
        return Result.success()
    }

    suspend fun cleanAllExpired() {
        for ((storageKey, type) in DriverFactory.getAllStorageKeys()) {
            val schema = (type as EntitySchemaProviderType).entitySchema!!
            when (type) {
                is SingletonType<*> -> {
                    removalManager.removeExpired(
                        if (type.containedType is EntityType) {
                            handleManager.rawEntitySingletonHandle(storageKey, schema)
                        } else handleManager.referenceSingletonHandle(storageKey, schema)
                    )
                }
                is CollectionType<*> -> {
                    removalManager.removeExpired(
                        if (type.containedType is EntityType) {
                            handleManager.rawEntityCollectionHandle(storageKey, schema)
                        } else handleManager.referenceCollectionHandle(storageKey, schema)
                    )
                }
                else -> throw IllegalStateException("Unexpected storage type")
            }
        }
    }

    companion object {
        /** Unique name of the worker, used to enqueue the periodic task in [WorkManager]. */
        const val WORKER_TAG = "PeriodicCleanupTask"
    }
}
