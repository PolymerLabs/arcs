package arcs.android.systemhealth.testapp

import android.content.Context
import android.content.Intent
import android.os.Debug
import androidx.lifecycle.Lifecycle
import arcs.core.data.HandleMode
import arcs.core.entity.Handle
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.TaggedLog
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle
import arcs.sdk.android.storage.ServiceStoreFactory
import com.google.common.math.StatsAccumulator
import java.text.DateFormat
import java.text.DecimalFormat
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.ScheduledThreadPoolExecutor
import java.util.concurrent.TimeUnit.MILLISECONDS
import java.util.concurrent.locks.ReadWriteLock
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.Any
import kotlin.Array
import kotlin.Boolean
import kotlin.Exception
import kotlin.Int
import kotlin.Long
import kotlin.Pair
import kotlin.String
import kotlin.Suppress
import kotlin.Throwable
import kotlin.Unit
import kotlin.also
import kotlin.apply
import kotlin.arrayOfNulls
import kotlin.concurrent.withLock
import kotlin.coroutines.CoroutineContext
import kotlin.emptyArray
import kotlin.let
import kotlin.math.ceil
import kotlin.random.Random
import kotlin.require
import kotlin.run
import kotlin.takeIf
import kotlin.toString
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

private typealias HandleType = SystemHealthEnums.HandleType
private typealias Function = SystemHealthEnums.Function
private typealias StorageMode = TestEntity.StorageMode
private typealias Settings = SystemHealthData.Settings
private typealias TaskEventQueue<T> = Pair<ReadWriteLock, MutableList<T>>

/** System health test core for performance, power, memory footprint and stability. */
class StorageCore(val context: Context, val lifecycle: Lifecycle) {
    /** Query the last record of system-health stats */
    val statsBulletin: String
        get() = _statsBulletin.value

    // Task event queue extensions
    private val Pair<ReadWriteLock, MutableList<TaskEvent>>.reader
        get() = this.first.readLock()
    private val Pair<ReadWriteLock, MutableList<TaskEvent>>.writer
        get() = this.first.writeLock()
    private val Pair<ReadWriteLock, MutableList<TaskEvent>>.queue
        get() = this.second

    // Single-threaded manager manages multiple-threaded tasks.
    private var taskManager = Executors.newSingleThreadExecutor()
    private var tasks: Array<ScheduledExecutorService> = emptyArray()
    private var taskManagerEvents: TaskEventQueue<TaskEvent> =
        TaskEventQueue(ReentrantReadWriteLock(), mutableListOf())
    private var tasksEvents: MutableMap<Int, TaskEventQueue<TaskEvent>> = mutableMapOf()
    private var controllers: Array<TaskController?> = emptyArray()
    private var handles: Array<TaskHandle> = emptyArray()

    private val log = TaggedLog(::toString)

    /**
     * As the only entry to accept then dispatch a test with [settings] to the [taskManager].
     * This should only be called by remote/local system health test service's onStartCommand.
     */
    fun accept(settings: Settings) {
        // The last one always wins!
        // It must be in the cancelling order of taskManager then tasks to prevent tasks from
        // being queued after tasks' shutdownNow() but before taskManager.shutdownNow() completes.
        taskManager.shutdownNow()
        tasks.forEach { it.shutdown() }

        require(
            arrayOf<ExecutorService>(*tasks, taskManager).all {
                it.awaitTermination(waitForPrevTaskShutdownMs, MILLISECONDS)
            }
        ) {
            val msg =
                """
        Previous run was neither finished nor shut down successfully!
        Please kill all relative processes to restart with a clean environment.
        """.trimIndent()
            log.error { msg }
            notify { msg }
        }

        taskManagerEvents.queue.clear()
        tasksEvents.clear()
        _statsBulletin.update { "" }

        if (settings.function != Function.STOP && settings.timesOfIterations > 0) {
            tasks = Array(settings.numOfListenerThreads + settings.numOfWriterThreads) { id ->
                object : ScheduledThreadPoolExecutor(1) {
                    override fun terminated() {
                        super.terminated()

                        // Close handle when the hosting task executor is terminated (shun down).
                        handles.getOrNull(id)?.let {
                            try {
                                closeHandle(it.handle, it.coroutineContext)
                                it.handle = null
                            } catch (e: Exception) {
                                log.error { "#$id: failed to close handle, reason: $e" }
                                e.printStackTrace()
                            }
                        }
                    }

                    override fun afterExecute(r: Runnable?, t: Throwable?) {
                        super.afterExecute(r, t)

                        t?.let { exception ->
                            // This is the outermost thread-wise exception watcher monitoring all unknown
                            // or unhandled exceptions against the innermost one which is Watchdog Exception
                            // Handler monitoring exceptions that happened in coroutine context.
                            val timestamp = System.currentTimeMillis()
                            val taskType = controllers.getOrNull(id)?.taskType?.name ?: ""
                            val msg = "$taskType #$id: $exception"
                            log.error { msg }
                            exception.printStackTrace()
                            taskManagerEvents.writer.withLock {
                                taskManagerEvents.queue.add(
                                    TaskEvent(TaskEventId.EXCEPTION, timestamp, desc = msg)
                                )
                            }

                            // Cancel the queued (not run) tasks and forbid new tasks.
                            controllers.getOrNull(id)?.future?.cancel(false)
                        }
                    }
                }
            }
            taskManager = Executors.newSingleThreadExecutor().apply {
                execute {
                    try {
                        // Running in the newly-created task manager thread context.

                        // Wait-time allowance for i.e. attaching profiler, debugger, etc.
                        if (settings.delayedStartMs > 0) {
                            Thread.sleep(settings.delayedStartMs.toLong())
                        }

                        taskManagerEvents.queue.add(
                            TaskEvent(TaskEventId.MEMORY_STATS, 0, MemoryStats.appJvmHeapKbytes)
                        )
                        this@StorageCore.execute(settings)
                    } catch (e: Exception) {
                        val msg = "Failed to run, reason: $e"
                        log.error { msg }
                        e.printStackTrace()
                        notify { msg }
                    } finally {
                        // Gracefully shut all tasks down which in turns calls all tasks' terminated().
                        tasks.forEach { it.shutdown() }
                    }
                }
            }
        }
    }

    private fun execute(settings: Settings) {
        val numOfTasks = settings.numOfListenerThreads + settings.numOfWriterThreads
        val watchdog = Watchdog(settings)

        // Task and handle manager assignments
        controllers = arrayOfNulls(numOfTasks)
        handles = tasks.mapIndexed { id, task ->
            // Per-task single-threaded execution context with Watchdog monitoring instabilities
            val taskCoroutineContext = watchdog.exceptionHandler(id) + task.asCoroutineDispatcher()
            TaskHandle(
                EntityHandleManager(
                    time = JvmTime,
                    activationFactory = ServiceStoreFactory(
                        context,
                        lifecycle,
                        taskCoroutineContext
                    ),
                    // Per-task single-threaded Scheduler being cascaded with Watchdog capabilities
                    scheduler = JvmSchedulerProvider(taskCoroutineContext)("sysHealthStorageCore")
                ),
                taskCoroutineContext
            ).apply {
                val taskType = when (id) {
                    in 0 until settings.numOfListenerThreads -> TaskType.LISTENER
                    else -> TaskType.WRITER
                }
                tasksEvents[id] = TaskEventQueue(ReentrantReadWriteLock(), mutableListOf())
                controllers[id] = TaskController(id, settings.timesOfIterations, taskType)
                runBlocking {
                    setUpHandle(this@apply, id, taskType, settings)
                }
            }
        }.toTypedArray()

        // Wait for syncing up model(s) between storage proxies and storage service.
        Thread.sleep(waitForDataSyncUpMs)

        controllers.filterNotNull().forEach { ctrl ->
            ctrl.future = tasks[ctrl.taskId].scheduleAtFixedRate(
                task@{
                    // Now we're running in per-task thread context.

                    val thisCountDown = --ctrl.countDown
                    thisCountDown.takeIf { it <= 0 }?.let {
                        // Forbid new tasks when running out the countdown
                        ctrl.future?.cancel(false)
                        if (it < 0) return@task
                    }

                    val taskHandle = handles[ctrl.taskId]
                    GlobalScope.launch(taskHandle.coroutineContext) {
                        when (ctrl.taskType) {
                            TaskType.LISTENER -> listenerTask(taskHandle, ctrl, settings)
                            else -> writerTask(taskHandle, ctrl, settings)
                        }
                    }
                },
                0,
                settings.iterationIntervalMs.toLong(),
                MILLISECONDS
            )
        }

        // WatchDog: summarize stats or bark/bite w.r.t latency, stability, etc.
        watchdog.monitor()
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun setUpHandle(
        taskHandle: TaskHandle,
        taskId: Int,
        taskType: TaskType?,
        settings: Settings
    ) = when (settings.handleType) {
        HandleType.SINGLETON -> {
            taskHandle.handle = (
                taskHandle.handleManager.createHandle(
                    HandleSpec(
                        "singletonHandle$taskId",
                        HandleMode.ReadWrite,
                        HandleContainerType.Singleton,
                        TestEntity.Companion
                    ),
                    when (settings.storageMode) {
                        TestEntity.StorageMode.PERSISTENT -> TestEntity.singletonPersistentStorageKey
                        else -> TestEntity.singletonInMemoryStorageKey
                    }
                ).awaitReady() as? ReadWriteSingletonHandle<TestEntity>
                                )?.apply {
                    onUpdate {
                        entity ->
                        if (settings.function == Function.LATENCY_BACKPRESSURE_TEST &&
                            taskType == TaskType.WRITER
                        ) {
                            tasksEvents[taskId]?.writer?.withLock {
                                tasksEvents[taskId]?.queue?.add(
                                    TaskEvent(
                                        TaskEventId.HANDLE_STORE_END,
                                        System.currentTimeMillis(),
                                        entity?.number
                                    )
                                )
                            }
                        }
                    }
                }
        }
        HandleType.COLLECTION -> {
            taskHandle.handle = (
                taskHandle.handleManager.createHandle(
                    HandleSpec(
                        "collectionHandle$taskId",
                        HandleMode.ReadWrite,
                        HandleContainerType.Collection,
                        TestEntity.Companion
                    ),
                    when (settings.storageMode) {
                        TestEntity.StorageMode.PERSISTENT -> TestEntity.collectionPersistentStorageKey
                        else -> TestEntity.collectionInMemoryStorageKey
                    }
                ).awaitReady() as? ReadWriteCollectionHandle<TestEntity>
                                )?.apply {
                    onUpdate {
                        entity ->
                        if (settings.function == Function.LATENCY_BACKPRESSURE_TEST &&
                            taskType == TaskType.WRITER
                        ) {
                            tasksEvents[taskId]?.writer?.withLock {
                                tasksEvents[taskId]?.queue?.add(
                                    TaskEvent(
                                        TaskEventId.HANDLE_STORE_END,
                                        System.currentTimeMillis(),
                                        entity.map { it.number }.toSet()
                                    )
                                )
                            }
                        }
                    }
                }
        }
    }

    private suspend inline fun <T> closeHandleSuspend(handle: T?) {
        if (handle is Handle) handle.close()
    }

    private fun <T> closeHandle(
        handle: T?,
        coroutineContext: CoroutineContext? = null
    ) {
        if (coroutineContext == null) {
            runBlocking { closeHandleSuspend(handle) }
        } else {
            GlobalScope.launch(coroutineContext) { closeHandleSuspend(handle) }
        }
    }

    private suspend fun listenerTask(
        taskHandle: TaskHandle,
        taskController: TaskController,
        settings: Settings
    ) {
        val timestampStart = System.currentTimeMillis()
        when (val handle = taskHandle.handle) {
            is ReadWriteSingletonHandle<*> -> handle.fetch()
            is ReadWriteCollectionHandle<*> -> handle.fetchAll()
        }
        val timeElapsed = System.currentTimeMillis() - timestampStart
        if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
            tasksEvents[taskController.taskId]?.writer?.withLock {
                tasksEvents[taskController.taskId]?.queue?.add(
                    TaskEvent(TaskEventId.HANDLE_FETCH_LATENCY, timeElapsed)
                )
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun writerTask(
        taskHandle: TaskHandle,
        taskController: TaskController,
        settings: Settings
    ) {
        val entity = SystemHealthTestEntity(settings.dataSizeInBytes)
        if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
            tasksEvents[taskController.taskId]?.writer?.withLock {
                tasksEvents[taskController.taskId]?.queue?.add(
                    TaskEvent(TaskEventId.HANDLE_STORE_BEGIN, System.currentTimeMillis(), entity.number)
                )
            }
        }

        when (val handle = taskHandle.handle) {
            is ReadWriteSingletonHandle<*> -> (
                handle as? ReadWriteSingletonHandle<TestEntity>
                                              )?.store(entity)?.join()
            is ReadWriteCollectionHandle<*> -> (
                handle as? ReadWriteCollectionHandle<TestEntity>
                                               )?.store(entity)?.join()
            else -> Unit
        }
    }

    private inner class Watchdog(val settings: Settings) {
        fun exceptionHandler(taskId: Int) =
            CoroutineExceptionHandler { _, exception ->
                // This is the innermost thread-wise exception handler monitoring all exceptions
                // that happened in coroutine context against the outermost one which is installed
                // at ScheduledThreadPoolExecutor.
                if (exception !is InterruptedException) {
                    val timestamp = System.currentTimeMillis()
                    val taskType = controllers.getOrNull(taskId)?.taskType?.name ?: ""
                    val msg = "$taskType #$taskId: $exception"
                    log.error { msg }
                    exception.printStackTrace()
                    taskManagerEvents.writer.withLock {
                        taskManagerEvents.queue.add(TaskEvent(TaskEventId.EXCEPTION, timestamp, desc = msg))
                    }

                    // Cancel all pending tasks and forbid new tasks.
                    controllers.getOrNull(taskId)?.future?.cancel(false)
                }

                // Don't ignore the exception being received.
                // The single task thread will be terminated upon the unhandled exception.
                throw exception
            }

        fun monitor() = tasks.takeIf { it.isNotEmpty() }.run {
            // All tasks should run fairly under CFS kernel policy.
            val awaitTimeMs = (settings.iterationIntervalMs + systemHzTickMs) * settings.timesOfIterations
            val progressUpdateTimes = ceil(awaitTimeMs / progressUpdateIntervalMs)
            for (progress in 0 until progressUpdateTimes.toInt()) {
                notify { "Progress: %.2f%%".format(progress * 100 / progressUpdateTimes) }
                tasks[Random.nextInt(0, tasks.size)].awaitTermination(
                    progressUpdateIntervalMs.toLong(), MILLISECONDS
                )
            }

            // Yield an extra time for tasks completing their final round trips i.e. until onXxx().
            Thread.sleep(watchdogExtraWaitTimeMs)

            var numOfUnFinishedTasks = 0
            val timestamp = System.currentTimeMillis()
            tasks.forEachIndexed { id, _ ->
                val isDone = controllers.getOrNull(id)?.future?.isDone ?: true
                if (!isDone) {
                    tasksEvents[id]?.writer?.withLock {
                        tasksEvents[id]?.queue?.add(TaskEvent(TaskEventId.TIMEOUT, timestamp))
                    }
                    numOfUnFinishedTasks++
                }
            }

            if (numOfUnFinishedTasks > 0) {
                taskManagerEvents.writer.withLock {
                    taskManagerEvents.queue.add(TaskEvent(TaskEventId.TIMEOUT, timestamp))
                }
            }

            notify { "Progress 100%: populating stats and report" }
            populateStatsBulletin()
        }
    }

    private fun populateStatsBulletin() {
        val stats = Stats()
            .generateHandleFetchLatencyStats()
            .generateHandleStoreLatencyStats()
            .generateAnomalyReport()
            .generateExceptionReport()

        // Put this after all stats generators as it clears up all tracked task events
        // so as to generate more accurate memory usage report.
        stats.clearAndGenerateMemoryUsageReport()

        // Atomic update{} implies repeating calls to the update block when the object's reference
        // was changed from somewhere else during this update block. Thus the best practice is to
        // keep the update block as short as possible and don't mutate any data inside it.
        _statsBulletin.update { stats.bulletin }

        notify(::statsBulletin)
    }

    private inline fun <T> notify(message: () -> T) {
        // Send a message/update to SystemHealthTestActivity to display on UI.
        context.sendBroadcast(
            Intent().apply {
                action = Function.SHOW_RESULTS.intent
                putExtra(Function.SHOW_RESULTS.name, message().toString())
            }
        )
    }

    private inner class Stats(var bulletin: String = "") {
        private val platformNewline = System.getProperty("line.separator") ?: "\r\n"

        @Suppress("UnstableApiUsage")
        fun generateHandleFetchLatencyStats(): Stats = also {
            val calculator = StatsAccumulator()

            tasksEvents.forEach { _, events ->
                events.reader.withLock {
                    calculator.addAll(
                        events.queue.filter { it.eventId == TaskEventId.HANDLE_FETCH_LATENCY }.map { it.timeMs }
                    )
                }
            }

            calculator.takeIf { it.count() > 0 }?.let {
                bulletin +=
                    """
          [fetch() latency]
          ${calculator.snapshot()}
          ${platformNewline.repeat(1)}
          """.trimIndent()
            }
        }

        @Suppress("UnstableApiUsage")
        fun generateHandleStoreLatencyStats(): Stats = also {
            val calculator = StatsAccumulator()

            tasksEvents.forEach { id, events ->
                val (s, e) = events.reader.withLock {
                    Pair(
                        events.queue.filter { it.eventId == TaskEventId.HANDLE_STORE_BEGIN }.toMutableList(),
                        events.queue.filter { it.eventId == TaskEventId.HANDLE_STORE_END }
                    )
                }

                // Oops! There are unfinished task(s).
                if (s.size > e.size) {
                    val msg = "thread #$id: HANDLE_STORE_BEGIN(${s.size}) > HANDLE_STORE_END(${e.size})"
                    taskManagerEvents.writer.withLock {
                        taskManagerEvents.queue.add(TaskEvent(TaskEventId.ANOMALY, 0, desc = msg))
                    }
                    log.warning { msg }
                }

                while (s.isNotEmpty()) {
                    s.removeAt(0).let {
                        val (_, sTimeMs, sInstance, _) = it
                        e.find {
                            val (_, eTimeMs, eInstance, _) = it
                            if (sTimeMs > eTimeMs) {
                                return@find false
                            }
                            when (eInstance) {
                                is Double -> eInstance == (sInstance as? Double)
                                is Set<*> -> eInstance.filterIsInstance<Double>().contains(sInstance as? Double)
                                else -> false
                            }
                        }?.let { calculator.addAll(it.timeMs - sTimeMs) }
                    }
                }
            }

            calculator.takeIf { it.count() > 0 }?.let {
                bulletin +=
                    """
          [store() latency]
          ${calculator.snapshot()}
          ${platformNewline.repeat(1)}
          """.trimIndent()
            }
        }

        fun generateAnomalyReport(): Stats = also {
            taskManagerEvents.reader.withLock {
                taskManagerEvents.queue.filter { it.eventId == TaskEventId.ANOMALY }.takeIf {
                    it.isNotEmpty()
                }?.let {
                    bulletin +=
                        """
            |[Anomaly Stats]
            ${it.joinToString(separator = platformNewline, prefix = "|")}
            ${platformNewline.repeat(1)}
            """.trimMargin("|")
                }
            }
        }

        fun generateExceptionReport(): Stats = also {
            taskManagerEvents.reader.withLock {
                taskManagerEvents.queue.filter { it.eventId == TaskEventId.EXCEPTION }.map {
                    "${DateFormat.getInstance().format(it.timeMs)}: ${it.desc}".trim()
                }.takeIf { it.isNotEmpty() }?.let {
                    bulletin +=
                        """
            |[Exception Stats]
            ${it.joinToString(separator = platformNewline, prefix = "|")}
            ${platformNewline.repeat(1)}
            """.trimMargin("|")
                }
            }
        }

        fun clearAndGenerateMemoryUsageReport(): Stats = also {
            var memInitial: Long? = null
            taskManagerEvents.reader.withLock {
                memInitial = taskManagerEvents.queue.filter {
                    it.eventId == TaskEventId.MEMORY_STATS
                }.first().instance as? Long
            }

            tasksEvents.forEach { _, taskEvents ->
                taskEvents.writer.withLock { taskEvents.queue.clear() }
            }
            taskManagerEvents.writer.withLock { taskManagerEvents.queue.clear() }

            memInitial?.let {
                val formatter = DecimalFormat("+#;-#")
                val hprofFilePath = context.applicationInfo.dataDir + "/" + hprofFile
                val memBeforeGc = MemoryStats.appJvmHeapKbytes

                // Whether gc or not is not guaranteed, synchronous or asynchronous gc is also
                // JVM implementation-dependent.
                Runtime.getRuntime().gc()
                Thread.sleep(GcWaitTimeMs)

                val memAfterGc = MemoryStats.appJvmHeapKbytes
                bulletin +=
                    """
          |[Memory Stats]
          |Private-dirty dalvik heap (before GC): ${formatter.format(memBeforeGc - it)} KB
          |Private-dirty dalvik heap (after GC): ${formatter.format(memAfterGc - it)} KB
          |Heap dump: $hprofFilePath
          ${platformNewline.repeat(1)}
          """.trimMargin("|")

                Debug.dumpHprofData(hprofFilePath)
            }
        }
    }

    private inner class StorageKeyGenerator(val settings: Settings) {
        val key: ReferenceModeStorageKey
            get() = keys.next()
        private val entitySchemaHash = "arcsscra"
        private val seqNo = atomic(0)
        private val keys = sequence {
            while (true) {
                if (settings.useRandomStorageKey) {
                    val id = seqNo.incrementAndGet()

                    yield(
                        when (settings.handleType) {
                            HandleType.SINGLETON -> {
                                when (settings.storageMode) {
                                    StorageMode.PERSISTENT -> {
                                        ReferenceModeStorageKey(
                                            backingKey = DatabaseStorageKey.Persistent(
                                                "singleton${id}_reference", entitySchemaHash, "arcs_test"
                                            ),
                                            storageKey = DatabaseStorageKey.Persistent(
                                                "singleton$id", entitySchemaHash, "arcs_test"
                                            )
                                        )
                                    }
                                    else -> {
                                        ReferenceModeStorageKey(
                                            backingKey = RamDiskStorageKey("singleton${id}_reference"),
                                            storageKey = RamDiskStorageKey("singleton$id")
                                        )
                                    }
                                }
                            }
                            else -> {
                                when (settings.storageMode) {
                                    StorageMode.PERSISTENT -> {
                                        ReferenceModeStorageKey(
                                            backingKey = DatabaseStorageKey.Persistent(
                                                "collection${id}_reference", entitySchemaHash, "arcs_test"
                                            ),
                                            storageKey = DatabaseStorageKey.Persistent(
                                                "collection$id", entitySchemaHash, "arcs_test"
                                            )
                                        )
                                    }
                                    else -> {
                                        ReferenceModeStorageKey(
                                            backingKey = RamDiskStorageKey("collection${id}_reference"),
                                            storageKey = RamDiskStorageKey("collection$id")
                                        )
                                    }
                                }
                            }
                        }
                    )
                } else {
                    yield(
                        when (settings.handleType) {
                            HandleType.SINGLETON -> {
                                when (settings.storageMode) {
                                    StorageMode.PERSISTENT -> TestEntity.singletonPersistentStorageKey
                                    else -> TestEntity.singletonInMemoryStorageKey
                                }
                            }
                            else -> {
                                when (settings.storageMode) {
                                    StorageMode.PERSISTENT -> TestEntity.collectionPersistentStorageKey
                                    else -> TestEntity.collectionInMemoryStorageKey
                                }
                            }
                        }
                    )
                }
            }
        }.iterator()
    }

    private data class TaskController(
        val taskId: Int,
        var countDown: Int,
        var taskType: TaskType? = null,
        var future: ScheduledFuture<*>? = null
    )
    private data class TaskHandle(
        val handleManager: EntityHandleManager,
        val coroutineContext: CoroutineContext,
        var handle: Any? = null
    )
    private data class TaskEvent(
        val eventId: TaskEventId,
        val timeMs: Long,
        val instance: Any? = null,
        val desc: String? = null
    )

    private enum class TaskType {
        LISTENER,
        WRITER,
    }

    private enum class TaskEventId {
        HANDLE_STORE_BEGIN,
        HANDLE_STORE_END,
        HANDLE_FETCH_LATENCY,
        MEMORY_STATS,
        EXCEPTION,
        TIMEOUT,
        ANOMALY,
    }

    companion object {
        private const val waitForPrevTaskShutdownMs = 500L
        private const val waitForDataSyncUpMs = 1000L
        private const val systemHzTickMs = 10L
        private const val watchdogExtraWaitTimeMs = 2000L
        private const val GcWaitTimeMs = 2000L
        private const val progressUpdateIntervalMs = 1000f
        private const val hprofFile = "arcs.hprof"
        private val _statsBulletin = atomic("")
    }
}

/**
 * System-health dedicated test entity which supported:
 * a) specified data length/size
 * b) unique data identity
 */
object SystemHealthTestEntity {
    const val BASE_SEQNO = 1.00000001E8
    const val BASE_BOOLEAN = true

    private val seqNo = atomic(0)
    private val allChars: List<Char> = ('a'..'z') + ('A'..'Z') + ('0'..'9')

    operator fun invoke(size: Int = 64) = TestEntity(
        // 16 = 4 ('true') + 12 ('1.xxxxxxx1E8')
        text = allChars[seqNo.value % allChars.size].toString().repeat(size - 16),
        // The atomic number is also treated as unique data id to pair round-trips.
        number = BASE_SEQNO + seqNo.getAndIncrement().toDouble() * 10,
        boolean = BASE_BOOLEAN
    )
}

/** Enclosing class for all enums being used during system health tests. */
class SystemHealthEnums {
    enum class Function(val intent: String = "") {
        STOP,
        LATENCY_BACKPRESSURE_TEST,
        SHOW_RESULTS("arcs.testapps.syshealth.SHOW_RESULTS"),
    }

    enum class HandleType {
        SINGLETON,
        COLLECTION
    }

    enum class ServiceType {
        LOCAL,
        REMOTE,
    }
}

/** Enclosing class for all data classes being used during system health tests. */
class SystemHealthData {
    data class IntentExtras(
        val function: String = "function",
        val handleType: String = "handle_type",
        val storage_mode: String = "storage_mode",
        val numOfListenerThreads: String = "num_of_listener_threads",
        val numOfWriterThreads: String = "num_of_writer_threads",
        val timesOfIterations: String = "times_of_iterations",
        val iterationIntervalMs: String = "iteration_interval_ms",
        val dataSizeInBytes: String = "data_size_bytes",
        val delayedStartMs: String = "delayed_start_ms",
        val useRandomStorageKey: String = "random_storage_key"
    )

    data class Settings(
        val function: Function = Function.STOP,
        val handleType: HandleType = HandleType.SINGLETON,
        val storageMode: StorageMode = StorageMode.IN_MEMORY,
        val numOfListenerThreads: Int = 1,
        val numOfWriterThreads: Int = 1,
        val timesOfIterations: Int = 1,
        val iterationIntervalMs: Int = 1000,
        val dataSizeInBytes: Int = 64,
        val delayedStartMs: Int = 0,
        val useRandomStorageKey: Boolean = false
    )
}
