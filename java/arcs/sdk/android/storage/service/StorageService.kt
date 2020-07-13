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
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import arcs.android.common.resurrection.ResurrectorService
import arcs.android.storage.ParcelableStoreOptions
import arcs.android.storage.database.DatabaseGarbageCollectionPeriodicTask
import arcs.android.storage.service.BindingContext
import arcs.android.storage.service.BindingContextStatsImpl
import arcs.android.storage.service.StorageServiceManager
import arcs.android.storage.ttl.PeriodicCleanupTask
import arcs.android.util.AndroidBinderStats
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.Store
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.database.name
import arcs.core.storage.database.persistent
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.util.Dispatchers as ArcsDispatchers
import arcs.core.util.TaggedLog
import arcs.core.util.performance.MemoryStats
import arcs.core.util.performance.PerformanceStatistics
import arcs.jvm.util.Executors as ArcsExecutors
import java.io.FileDescriptor
import java.io.PrintWriter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking

/**
 * Implementation of a [Service] which manages [Store]s and exposes the ability to access them via
 * the [IStorageService] interface when bound-to by a client.
 */
open class StorageService : ResurrectorService() {
    protected open val coroutineContext =
        ArcsDispatchers.server + CoroutineName("StorageService")
    protected open val writeBackScope = CoroutineScope(
        ArcsExecutors.io.asCoroutineDispatcher() + SupervisorJob()
    )
    private val stores = ConcurrentHashMap<StorageKey, Store<*, *, *>>()
    private var startTime: Long? = null
    private val stats = BindingContextStatsImpl()
    private val log = TaggedLog { "StorageService" }
    // Can be overridden by subclasses.
    open val config = StorageServiceConfig(ttlJobEnabled = true, garbageCollectionJobEnabled = true)
    private val workManager: WorkManager by lazy { WorkManager.getInstance(this) }

    @ExperimentalCoroutinesApi
    override fun onCreate() {
        super.onCreate()
        log.debug { "onCreate" }
        startTime = startTime ?: System.currentTimeMillis()

        StoreWriteBack.init(writeBackScope)

        schedulePeriodicJobs(config)
    }

    private fun scheduleTtlJob(ttlHoursInterval: Long) {
        val periodicCleanupTask =
            PeriodicWorkRequest.Builder(
                PeriodicCleanupTask::class.java,
                ttlHoursInterval,
                TimeUnit.HOURS
            )
            .addTag(PeriodicCleanupTask.WORKER_TAG)
            .build()
        workManager.enqueueUniquePeriodicWork(
            PeriodicCleanupTask.WORKER_TAG,
            ExistingPeriodicWorkPolicy.REPLACE,
            periodicCleanupTask
        )
    }

    private fun scheduleGcJob(garbageCollectionHoursInterval: Long) {
        val garbageCollectionTask =
            PeriodicWorkRequest.Builder(
                DatabaseGarbageCollectionPeriodicTask::class.java,
                garbageCollectionHoursInterval,
                TimeUnit.HOURS
            )
            .addTag(DatabaseGarbageCollectionPeriodicTask.WORKER_TAG)
            .setConstraints(
                Constraints.Builder()
                    .setRequiresDeviceIdle(true)
                    .setRequiresCharging(true)
                    .build()
            )
            .build()
        workManager.enqueueUniquePeriodicWork(
            DatabaseGarbageCollectionPeriodicTask.WORKER_TAG,
            ExistingPeriodicWorkPolicy.REPLACE,
            garbageCollectionTask
        )
    }

    protected fun schedulePeriodicJobs(config: StorageServiceConfig) {
        if (config.ttlJobEnabled) {
            scheduleTtlJob(config.ttlHoursInterval)
        } else {
            workManager.cancelAllWorkByTag(PeriodicCleanupTask.WORKER_TAG)
        }
        if (config.garbageCollectionJobEnabled) {
            scheduleGcJob(config.garbageCollectionHoursInterval)
        } else {
            workManager.cancelAllWorkByTag(DatabaseGarbageCollectionPeriodicTask.WORKER_TAG)
        }
    }

    @ExperimentalCoroutinesApi
    override fun onBind(intent: Intent): IBinder? {
        log.debug { "onBind: $intent" }

        if (intent.action == MANAGER_ACTION) {
            return StorageServiceManager(coroutineContext, stores)
        }

        val parcelableOptions = requireNotNull(
            intent.getParcelableExtra<ParcelableStoreOptions?>(EXTRA_OPTIONS)
        ) { "No StoreOptions found in Intent" }

        val options =
            parcelableOptions.actual.copy(coroutineContext = coroutineContext)
        return BindingContext(
            stores.computeIfAbsent(options.storageKey) {
                Store<CrdtData, CrdtOperationAtTime, Any>(options)
            },
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
        writeBackScope.cancel()
    }

    override fun dump(fd: FileDescriptor, writer: PrintWriter, args: Array<out String>) {
        val elapsedTime = System.currentTimeMillis() - (startTime ?: System.currentTimeMillis())
        val storageKeys = stores.keys.map { it }.toSet()

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
                |Transaction Statistics (level of concurrency):
                |  - Current: ${stats.transactions.current}
                |  - Peak: ${stats.transactions.peak}
            """.trimMargin("|")
        )

        // Dump current process global binder stats to understand contention in the thread pool,
        // peak usage of shared binder memory, the number of pending transactions, etc.
        // Hide the dump when failing to fetch the stats from the kernel binder driver.
        mapOf(
            "Memory high watermark (pages)" to "pages high watermark",
            "Pending transactions" to "pending transactions",
            "Requested threads" to "requested threads",
            "Ready threads" to "ready threads"
        ).run {
            AndroidBinderStats.query(*values.toTypedArray()).iterator().let { stats ->
                mapValues { stats.next() }
            }
        }.takeIf { it.any { (_, v) -> v.isNotEmpty() } }?.run {
            writer.println(
                """
                    |Current Process Binder Stats:
                    |  - ${map { (k, v) -> "$k: $v" }.joinToString("\n|  - ")}
                """.trimMargin("|")
            )
        }

        MemoryStats.snapshot().run {
            writer.println(
                """
                    |Process Memory Stats (KB):
                    |  - ${map { (k, v) -> "${k.name}: $v" }.joinToString("\n|  - ")}
                """.trimMargin("|")
            )
        }

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
                |$pad  Counts per measurement (name: average, standard deviation, min, max):
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
                    |$pad    ${counter.padEnd(35)}%.2f, %.2f, %.2f, %.2f
                """.trimMargin("|")
                    .format(stats.mean, stats.standardDeviation, stats.min ?: 0.0, stats.max ?: 0.0)
            )
        }
        writer.println()
    }

    data class StorageServiceConfig(
        val ttlJobEnabled: Boolean,
        val ttlHoursInterval: Long = TTL_JOB_INTERVAL_HOURS,
        val garbageCollectionJobEnabled: Boolean,
        val garbageCollectionHoursInterval: Long = GC_JOB_INTERVAL_HOURS
    )

    companion object {
        // Default value for ttl periodic job interval.
        const val TTL_JOB_INTERVAL_HOURS = 12L
        // Default value for garbage collection periodic job interval.
        const val GC_JOB_INTERVAL_HOURS = 24L

        const val EXTRA_OPTIONS = "storeOptions"
        const val MANAGER_ACTION = "arcs.sdk.android.storage.service.MANAGER"

        init {
            // TODO: Remove this, the Allocator should be responsible for setting up providers.
            RamDiskDriverProvider()
        }

        /**
         * Creates an [Intent] to use when binding to the [StorageService] from a [ServiceStore].
         */
        fun createBindIntent(context: Context, storeOptions: ParcelableStoreOptions): Intent =
            Intent(context, StorageService::class.java).apply {
                action = storeOptions.actual.storageKey.toString()
                putExtra(EXTRA_OPTIONS, storeOptions)
            }

        /**
         * Creates an [Intent] to use to get a [IStorageServiceManager] binding to the
         * [StorageService].
         */
        fun createStorageManagerBindIntent(context: Context): Intent =
            Intent(context, StorageService::class.java).apply {
                action = MANAGER_ACTION
            }

        // Can be used to cancel all periodic jobs when the service is not running.
        fun cancelAllPeriodicJobs(context: Context) {
            val workManager = WorkManager.getInstance(context)
            workManager.cancelAllWorkByTag(PeriodicCleanupTask.WORKER_TAG)
            workManager.cancelAllWorkByTag(DatabaseGarbageCollectionPeriodicTask.WORKER_TAG)
        }
    }
}
