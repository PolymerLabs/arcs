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
import androidx.lifecycle.LifecycleService

/**
 * Arcs system-health-test local service.
 * The local service type evaluates latency/RTT within the same process boundary,
 * stability of storage service, etc.
 */
class LocalService : LifecycleService() {
    private val storageCore = StorageCore(this, lifecycle)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        // Parse local service's specific settings.
        val settings = intent?.let {
            SystemHealthData.Settings(
                enumValueOf(
                    it.getStringExtra(
                        intentExtras.function
                    ) ?: defaultSettings.function.name
                ),
                enumValueOf(
                    it.getStringExtra(
                        intentExtras.handleType
                    ) ?: defaultSettings.handleType.name
                ),
                enumValueOf(
                    it.getStringExtra(
                        intentExtras.storage_mode
                    ) ?: defaultSettings.storageMode.name
                ),
                maxOf(
                    it.getIntExtra(
                        intentExtras.numOfListenerThreads,
                        defaultSettings.numOfListenerThreads
                    ),
                    0
                ),
                maxOf(
                    it.getIntExtra(
                        intentExtras.numOfWriterThreads,
                        defaultSettings.numOfWriterThreads
                    ),
                    0
                ),
                maxOf(
                    it.getIntExtra(
                        intentExtras.timesOfIterations,
                        defaultSettings.timesOfIterations
                    ),
                    0
                ),
                maxOf(
                    it.getIntExtra(
                        intentExtras.iterationIntervalMs,
                        defaultSettings.iterationIntervalMs
                    ),
                    0
                ),
                maxOf(
                    it.getIntExtra(
                        intentExtras.dataSizeInBytes,
                        defaultSettings.dataSizeInBytes
                    ),
                    0
                ),
                maxOf(
                    it.getIntExtra(
                        intentExtras.delayedStartMs,
                        defaultSettings.delayedStartMs
                    ),
                    0
                )
            )
        } ?: defaultSettings

        storageCore.accept(settings)

        return Service.START_NOT_STICKY
    }

    companion object {
        private val intentExtras = SystemHealthData.IntentExtras()
        private val defaultSettings = SystemHealthData.Settings()
    }
}
