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
package arcs.sdk.android.storage.service

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import arcs.core.util.TaggedLog
import kotlin.reflect.KClass
import kotlinx.coroutines.runBlocking

/**
 * Implementation of a [Worker] which performs periodic scan of storage and deletes unused data.
 */
class DatabaseGarbageCollectionPeriodicTaskV2(
  appContext: Context,
  workerParams: WorkerParameters,
  private val binderHelper: BindHelper = DefaultBindHelper(appContext),
  private val storageServiceClass: KClass<out StorageService> = StorageService::class
) : Worker(appContext, workerParams) {

  // WorkManager requires a constructor with exactly those two parameters.
  constructor(appContext: Context, workerParams: WorkerParameters) :
    this(appContext, workerParams, DefaultBindHelper(appContext))

  private val log = TaggedLog { WORKER_TAG }

  init {
    log.debug { "Created." }
  }

  // Note on `runBlocking` usage:
  // `doWork` is run synchronously by the work manager.
  // This is one of the rare cases that runBlocking was intended for: implementing the
  // functionality of a synchronous API but requiring the use of suspending methods.
  //
  // Returning from `doWork` is a signal of completion, so we must block here.
  //
  // To avoid blocking thread issues, ensure that the work manager will not schedule this
  // work on any important threads that you're using elsewhere.
  override fun doWork(): Result = runBlocking {
    log.debug { "Running." }
    val success = StorageServiceManagerEndpointImpl(
      binderHelper,
      this,
      storageServiceClass.java
    ).runGarbageCollection()
    log.debug { "Success=$success." }
    // Indicate whether the task finished successfully with the Result
    Result.success()
  }

  companion object {
    /**
     * Unique name of the worker, used to enqueue the periodic task in [WorkManager].
     * This needs to be different from the v1 task.
     */
    const val WORKER_TAG = "DatabaseGarbageCollectionPeriodicTaskV2"
  }
}
