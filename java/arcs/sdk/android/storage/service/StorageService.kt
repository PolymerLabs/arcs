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

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.IBinder
import android.text.format.DateUtils
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import androidx.work.Worker
import arcs.android.common.resurrection.ResurrectorService
import arcs.android.storage.database.DatabaseGarbageCollectionPeriodicTask
import arcs.android.storage.service.DevToolsProxyImpl
import arcs.android.storage.service.DevToolsStorageManager
import arcs.android.storage.service.MuxedStorageServiceImpl
import arcs.android.storage.service.ReferencedStores
import arcs.android.storage.service.StorageServiceManager
import arcs.android.storage.service.StorageServiceNgImpl
import arcs.android.storage.ttl.PeriodicCleanupTask
import arcs.android.util.AndroidBinderStats
import arcs.core.analytics.Analytics
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ActiveStore
import arcs.core.storage.DefaultDriverFactory
import arcs.core.storage.DriverFactory
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.WriteBackProvider
import arcs.core.storage.database.name
import arcs.core.storage.database.persistent
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.util.TaggedLog
import arcs.core.util.performance.MemoryStats
import arcs.core.util.performance.PerformanceStatistics
import arcs.core.util.statistics.TransactionCounter
import arcs.core.util.statistics.TransactionStatisticsImpl
import arcs.flags.BuildFlags
import arcs.jvm.util.JvmTime
import java.io.FileDescriptor
import java.io.PrintWriter
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.reflect.KClass
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

/**
 * Implementation of a [Service] which manages [Store]s and exposes the ability to access them via
 * the [IStorageService] interface when bound-to by a client.
 */
@OptIn(ExperimentalCoroutinesApi::class)
open class StorageService : ResurrectorService() {
  // Can be overridden by subclasses.
  protected open val coroutineContext = Dispatchers.Default + CoroutineName("StorageService")
  protected open val writeBackScope = CoroutineScope(
    Executors.newCachedThreadPool {
      Thread(it).apply { name = "WriteBack #$id" }
    }.asCoroutineDispatcher() + SupervisorJob()
  )
  protected open val config =
    StorageServiceConfig(ttlJobEnabled = true, garbageCollectionJobEnabled = true)

  protected open val time = JvmTime

  protected open val analytics: Analytics = Analytics.defaultAnalytics

  private val driverFactory: DriverFactory
    get() = DefaultDriverFactory.get()

  private var startTime: Long? = null
  private val stats = TransactionStatisticsImpl(JvmTime, globalTransactionCounter)
  private val log = TaggedLog { "StorageService" }
  private val workManager: WorkManager by lazy { WorkManager.getInstance(this) }
  private var devToolsProxy: DevToolsProxyImpl? = null
  private val storesScope by lazy { CoroutineScope(coroutineContext) }

  private val writeBackProvider: WriteBackProvider = { protocol ->
    StoreWriteBack(protocol, Channel.UNLIMITED, false, writeBackScope)
  }

  private val stores by lazy {
    ReferencedStores(
      { getScope() },
      { getFactory() },
      writeBackProvider,
      devToolsProxy,
      time,
      analytics
    )
  }

  /** Return the number of [ActiveStore] instances maintained by the service right now. */
  suspend fun storeCount() = stores.size()

  override fun onCreate() {
    super.onCreate()
    log.debug { "onCreate" }
    startTime = startTime ?: System.currentTimeMillis()

    schedulePeriodicJobs(config)

    val appFlags = application?.applicationInfo?.flags ?: 0
    if (0 != appFlags and ApplicationInfo.FLAG_DEBUGGABLE) {
      devToolsProxy = DevToolsProxyImpl()
    }
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

  private fun scheduleGcJob(interval: Long, klass: KClass<out Worker>, tag: String) {
    val garbageCollectionTask =
      PeriodicWorkRequest.Builder(
        klass.java,
        interval,
        TimeUnit.HOURS
      )
        .addTag(tag)
        .setConstraints(
          Constraints.Builder()
            .setRequiresDeviceIdle(true)
            .setRequiresCharging(true)
            .build()
        )
        .build()
    workManager.enqueueUniquePeriodicWork(
      tag,
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
      if (config.useGarbageCollectionTaskV2) {
        scheduleGcJob(
          config.garbageCollectionHoursInterval,
          DatabaseGarbageCollectionPeriodicTaskV2::class,
          DatabaseGarbageCollectionPeriodicTaskV2.WORKER_TAG
        )
        workManager.cancelAllWorkByTag(DatabaseGarbageCollectionPeriodicTask.WORKER_TAG)
      } else {
        scheduleGcJob(
          config.garbageCollectionHoursInterval,
          DatabaseGarbageCollectionPeriodicTask::class,
          DatabaseGarbageCollectionPeriodicTask.WORKER_TAG
        )
        workManager.cancelAllWorkByTag(DatabaseGarbageCollectionPeriodicTaskV2.WORKER_TAG)
      }
    } else {
      workManager.cancelAllWorkByTag(DatabaseGarbageCollectionPeriodicTask.WORKER_TAG)
      workManager.cancelAllWorkByTag(DatabaseGarbageCollectionPeriodicTaskV2.WORKER_TAG)
    }
  }

  override fun onBind(intent: Intent): IBinder? {
    log.debug { "onBind: $intent" }

    if (BuildFlags.ENTITY_HANDLE_API) {
      if (intent.action == MUXED_STORAGE_SERVICE_ACTION) {
        return MuxedStorageServiceImpl(
          storesScope,
          stats,
          driverFactory,
          writeBackProvider,
          devToolsProxy,
          time
        )
      }
    }

    when (intent.action) {
      STORAGE_SERVICE_NG_ACTION -> {
        return StorageServiceNgImpl(
          storesScope,
          stats,
          ::onStorageProxyMessage,
          stores
        )
      }
      MANAGER_ACTION -> {
        return StorageServiceManager(
          storesScope,
          driverFactory,
          DatabaseDriverProvider.manager,
          stores
        )
      }
      DEVTOOLS_ACTION -> {
        val flags = application?.applicationInfo?.flags ?: 0
        require(flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
          "FLAG_DEBUGGABLE is required to launch the DevToolsStorageManager"
        }
        val devToolsProxy = requireNotNull(devToolsProxy) {
          "A DevToolsProxy is required to launch the DevToolsStorageManager"
        }
        return DevToolsStorageManager(stores, devToolsProxy)
      }
      else -> {
        throw IllegalArgumentException("Unrecognised intent action: ${intent.action}")
      }
    }
  }

  private suspend fun onStorageProxyMessage(storageKey: StorageKey, message: UntypedProxyMessage) {
    when (message) {
      is ProxyMessage.ModelUpdate<*, *, *>,
      is ProxyMessage.Operations<*, *, *> -> resurrectClients(storageKey)
      is ProxyMessage.SyncRequest<*, *, *> -> Unit
    }
  }

  override fun onUnbind(intent: Intent?): Boolean {
    log.debug { "onUnbind: $intent" }
    if (intent?.action == STORAGE_SERVICE_NG_ACTION) {
      storesScope.launch {
        stores.clear()
      }
    }
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    super.onDestroy()
    storesScope.cancel()
    writeBackScope.cancel()
  }

  override fun dump(fd: FileDescriptor, writer: PrintWriter, args: Array<out String>) {
    val elapsedTime = System.currentTimeMillis() - (startTime ?: System.currentTimeMillis())
    val storageKeys = stores.storageKeys().map { it }.toSet()

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
                |  - Current: ${stats.currentTransactions}
                |  - Peak: ${stats.peakTransactions}
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

  @Suppress("UNCHECKED_CAST")
  private suspend fun getStore(
    options: StoreOptions
  ): ActiveStore<CrdtData, CrdtOperation, Any> {
    return stores.getOrPut(options).store as ActiveStore<CrdtData, CrdtOperation, Any>
  }

  private fun getFactory(): DriverFactory {
    return driverFactory
  }

  private fun getScope(): CoroutineScope {
    return storesScope
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
    val garbageCollectionHoursInterval: Long = GC_JOB_INTERVAL_HOURS,
    val useGarbageCollectionTaskV2: Boolean = false
  )

  companion object {
    // Default value for ttl periodic job interval.
    const val TTL_JOB_INTERVAL_HOURS = 12L

    // Default value for garbage collection periodic job interval.
    const val GC_JOB_INTERVAL_HOURS = 24L

    const val EXTRA_OPTIONS = "storeOptions"
    const val MANAGER_ACTION = "arcs.sdk.android.storage.service.MANAGER"
    const val DEVTOOLS_ACTION = "DevTools_Action"
    const val MUXED_STORAGE_SERVICE_ACTION =
      "arcs.sdk.android.storage.service.MUXED_STORAGE_SERVICE"

    // TODO(b/178332056): Rename after storage service migration.
    val STORAGE_SERVICE_NG_ACTION: String
      get() {
        return "arcs.sdk.android.storage.service.STORAGE_SERVICE_NG"
      }

    // Can be used to cancel all periodic jobs when the service is not running.
    fun cancelAllPeriodicJobs(context: Context) {
      val workManager = WorkManager.getInstance(context)
      workManager.cancelAllWorkByTag(PeriodicCleanupTask.WORKER_TAG)
      workManager.cancelAllWorkByTag(DatabaseGarbageCollectionPeriodicTask.WORKER_TAG)
    }

    private val globalTransactionCounter = TransactionCounter()
  }
}

object StorageServiceIntentHelpers {
  /**
   * A helper to create the [Intent] needed to bind to the manager interface of a [StorageService].
   *
   * @param context an Android [Context] that will be used to create the [Intent]
   * @param storageServiceClass an optional implementation class that can be provided if your
   *  application is using a subclass of [StorageService].
   */
  fun managerIntent(
    context: Context,
    storageServiceClass: Class<*> = StorageService::class.java
  ): Intent = Intent(context, storageServiceClass).apply {
    action = StorageService.MANAGER_ACTION
  }

  /**
   * A helper to create the [Intent] needed to bind to the StorageServiceNG interface of a
   * [StorageService].
   *
   * @param context an Android [Context] that will be used to create the [Intent]
   * @param storageServiceClass an optional implementation class that can be provided if your
   *  application is using a subclass of [StorageService].
   */
  fun storageServiceNgIntent(
    context: Context,
    storageServiceClass: Class<*> = StorageService::class.java
  ): Intent {
    return Intent(context, storageServiceClass).apply {
      action = StorageService.STORAGE_SERVICE_NG_ACTION
    }
  }
}
