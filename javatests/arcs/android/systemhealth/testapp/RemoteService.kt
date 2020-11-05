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

package arcs.android.systemhealth.testapp

import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * Arcs system-health-test remote service.
 * The remote service type evaluates latency/RTT crossing process boundary,
 * stability of storage clients, etc.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class RemoteService : Service() {
  private val storageCore = StorageCore(this)
  private val binder = Binder()

  override fun onBind(intent: Intent): IBinder {
    // Parse remote service's specific settings.
    val settings = SystemHealthData.Settings(
      enumValueOf(
        intent.getStringExtra(
          intentExtras.function
        ) ?: defaultSettings.function.name
      ),
      enumValueOf(
        intent.getStringExtra(
          intentExtras.handleType
        ) ?: defaultSettings.handleType.name
      ),
      enumValueOf(
        intent.getStringExtra(
          intentExtras.storage_mode
        ) ?: defaultSettings.storageMode.name
      ),
      maxOf(
        intent.getIntExtra(
          intentExtras.numOfListenerThreads,
          defaultSettings.numOfListenerThreads
        ),
        0
      ),
      maxOf(
        intent.getIntExtra(
          intentExtras.numOfWriterThreads,
          defaultSettings.numOfWriterThreads
        ),
        0
      ),
      maxOf(
        intent.getIntExtra(
          intentExtras.timesOfIterations,
          defaultSettings.timesOfIterations
        ),
        0
      ),
      maxOf(
        intent.getIntExtra(
          intentExtras.iterationIntervalMs,
          defaultSettings.iterationIntervalMs
        ),
        0
      ),
      maxOf(
        intent.getIntExtra(
          intentExtras.dataSizeInBytes,
          defaultSettings.dataSizeInBytes
        ),
        0
      ),
      intent.getIntExtra(
        intentExtras.clearedEntities,
        defaultSettings.clearedEntities
      ),
      maxOf(
        intent.getIntExtra(
          intentExtras.delayedStartMs,
          defaultSettings.delayedStartMs
        ),
        0
      ),
      minOf(
        intent.getIntExtra(
          intentExtras.storageServiceCrashRate,
          defaultSettings.storageServiceCrashRate
        ),
        100
      ),
      minOf(
        intent.getIntExtra(
          intentExtras.storageClientCrashRate,
          defaultSettings.storageClientCrashRate
        ),
        100
      )
    )

    storageCore.accept(settings)

    return binder
  }

  companion object {
    private val intentExtras = SystemHealthData.IntentExtras()
    private val defaultSettings = SystemHealthData.Settings()
  }
}
