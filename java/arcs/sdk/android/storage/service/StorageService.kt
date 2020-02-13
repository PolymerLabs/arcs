/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.android.storage.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.text.format.DateUtils
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import arcs.android.common.resurrection.ResurrectorService
import arcs.android.storage.ParcelableStoreOptions
import arcs.android.storage.service.BindingContext
import arcs.android.storage.service.BindingContextStatsImpl
import arcs.android.storage.ttl.PeriodicCleanupTask
import arcs.core.storage.ProxyMessage
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.database.name
import arcs.core.storage.database.persistent
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.util.TaggedLog
import arcs.core.util.performance.PerformanceStatistics
import java.io.FileDescriptor
import java.io.PrintWriter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking

/**
 * Implementation of a [Service] which manages [Store]s and exposes the ability to access them via
 * the [IStorageService] interface when bound-to by a client.
 */
class StorageService : ResurrectorService() {
    private val coroutineContext = Dispatchers.IO + CoroutineName("StorageService")
    private val scope = CoroutineScope(coroutineContext)
    private val stores = ConcurrentHashMap<StoreOptions<*, *, *>, Store<*, *, *>>()
    private var startTime: Long? = null
    private val stats = BindingContextStatsImpl()
    private val log = TaggedLog { "StorageService" }

    override fun onCreate() {
        super.onCreate()
        log.debug { "onCreate" }
        startTime = startTime ?: System.currentTimeMillis()

        val periodicCleanupTask =
            PeriodicWorkRequest.Builder(PeriodicCleanupTask::class.java, 1, TimeUnit.HOURS)
                .addTag(PeriodicCleanupTask.WORKER_TAG)
                .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            PeriodicCleanupTask.WORKER_TAG,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicCleanupTask
        )
    }

    override fun onBind(intent: Intent): IBinder? {
        log.debug { "onBind: $intent" }
        val parcelableOptions = requireNotNull(
            intent.getParcelableExtra<ParcelableStoreOptions?>(EXTRA_OPTIONS)
        ) { "No StoreOptions found in Intent" }

        return BindingContext(
            stores.computeIfAbsent(parcelableOptions.actual) { Store(it) },
            parcelableOptions.crdtType,
            coroutineContext,
            stats
        ) { storageKey, message ->
            when (message) {
                is ProxyMessage.ModelUpdate<*, *, *>,
                is ProxyMessage.Operations<*, *, *> -> resurrectClients(storageKey)
                is ProxyMessage.SyncRequest<*, *, *> -> Unit
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    override fun dump(fd: FileDescriptor, writer: PrintWriter, args: Array<out String>) {
        val elapsedTime = System.currentTimeMillis() - (startTime ?: System.currentTimeMillis())
        val storageKeys = stores.keys.map { it.storageKey }.toSet()

        val statsPercentiles = stats.roundtripPercentiles

        writer.println(
            """
                |Arcs StorageService:
                |--------------------
                |
                |Uptime: ${DateUtils.formatElapsedTime(elapsedTime / 1000)}
                |Active StorageKeys: 
                |${storageKeys.joinToString(",\n\t", prefix = "[\n\t", postfix = "\n]")}
                |ProxyMessage Roundtrip Statistics (ms):
                |  - Average: ${stats.roundtripMean}
                |  - StdDev:  ${stats.roundtripStdDev}
                |  - 75th percentile: ${statsPercentiles.seventyFifth}
                |  - 90th percentile: ${statsPercentiles.ninetieth}
                |  - 99th percentile: ${statsPercentiles.ninetyNinth}
            """.trimMargin("|")
        )

        writer.println()

        if (DatabaseDriverProvider.isConfigured) {
            val databaseManager = DatabaseDriverProvider.manager
            val statistics = runBlocking { databaseManager.snapshotStatistics() }

            if (statistics.isNotEmpty()) {
                writer.println(
                    """
                        Databases:
                        ----------
                    """.trimIndent()
                )
            }

            statistics.forEach { (identifier, snapshot) ->
                val persistenceLabel = if (identifier.persistent) "persistent" else "non-persistent"
                writer.println(
                    """
                        |  ${identifier.name} ($persistenceLabel):
                    """.trimMargin("|")
                )
                snapshot.insertUpdate.dump(writer, pad = "    ", title = "Insertions/Updates")
                snapshot.get.dump(writer, pad = "    ", title = "Gets")
                snapshot.delete.dump(writer, pad = "    ", title = "Deletions")
                writer.println()
            }
        }

        dumpRegistrations(writer)
    }

    private fun PerformanceStatistics.Snapshot.dump(
        writer: PrintWriter,
        pad: String,
        title: String
    ) {
        val runtime = runtimeStatistics
        val counters = countStatistics
        val counterNames = counters.counterNames.sorted()
        writer.println(
            """
                |$pad$title (%d measurements):
                |$pad  Runtime (ms):
                |$pad    Average: %.3f 
                |$pad    StdDev: %.3f 
                |$pad    Min: %.3f
                |$pad    Max: %.3f 
                |        
                |${pad}Counts per measurement (name: average, standard deviation, min, max):
            """.trimMargin()
                .format(
                    runtime.measurements,
                    runtime.mean / 1e6,
                    runtime.standardDeviation / 1e6,
                    (runtime.min ?: 0.0) / 1e6,
                    (runtime.max ?: 0.0) / 1e6
                )
        )
        counterNames.forEach { counter ->
            val stats = counters[counter]
            writer.println(
                """
                    |$pad  $counter: 
                    |$pad    %.2f, %.2f, %.2f, %.2f 
                """.trimMargin("|")
                    .format(stats.mean, stats.standardDeviation, stats.min ?: 0, stats.max ?: 0)
            )
        }
    }

    companion object {
        private const val EXTRA_OPTIONS = "storeOptions"

        init {
            // TODO: Remove this, the Allocator should be responsible for setting up providers.
            RamDiskDriverProvider()
        }

        /**
         * Creates an [Intent] to use when binding to the [StorageService] from a [ServiceStore].
         */
        fun createBindIntent(context: Context, storeOptions: ParcelableStoreOptions): Intent =
            Intent(context, StorageService::class.java).apply {
                putExtra(EXTRA_OPTIONS, storeOptions)
            }
    }
}
