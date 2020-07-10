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

import android.content.Context
import android.content.Intent
import android.os.Debug
import android.os.Trace
import androidx.lifecycle.Lifecycle
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.Reference
import arcs.core.storage.StoreManager
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.TaggedLog
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.DefaultStorageServiceBindingDelegate
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
import kotlin.system.measureTimeMillis
import kotlin.takeIf
import kotlin.toString
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

private typealias HandleType = SystemHealthEnums.HandleType
private typealias Function = SystemHealthEnums.Function
private typealias StorageMode = TestEntity.StorageMode
private typealias Settings = SystemHealthData.Settings
private typealias TaskEventQueue<T> = Pair<ReadWriteLock, MutableList<T>>

/** System health test core for performance, power, memory footprint and stability. */
@ExperimentalCoroutinesApi
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
    private lateinit var settings: Settings

    private var earlyExit = false

    private val log = TaggedLog(::toString)

    private val memoryFootprint: Array<Pair<String, Long>>
        get() {
            val currMem = arrayOf(
                "appJvmHeapKbytes" to MemoryStats.appJvmHeapKbytes,
                "appNativeHeapKbytes" to MemoryStats.appNativeHeapKbytes,
                "allHeapsKbytes" to MemoryStats.allHeapsKbytes
            )
            for ((k, v) in currMem) {
                Trace.setCounter(k, v)
            }
            return currMem
        }

    /**
     * As the only entry to accept then dispatch a test with [settings] to the [taskManager].
     * This should only be called by remote/local system health test service's onStartCommand.
     */
    fun accept(settings: Settings) {
        this.settings = settings

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

        val numOfTasks =
            settings.numOfListenerThreads +
            settings.numOfWriterThreads +
            if (settings.clearedEntities >= 0) 1 else 0
        if (settings.function != Function.STOP && settings.timesOfIterations > 0) {
            notify { "Preparing data and tests..." }
            tasks = Array(numOfTasks) { id ->
                object : ScheduledThreadPoolExecutor(
                    if (settings.function == Function.STABILITY_TEST) 2 else 1) {
                    override fun terminated() {
                        super.terminated()

                        // Close handle when the hosting task executor is terminated (shun down).
                        handles.getOrNull(id)?.let {
                            try {
                                closeHandle(it.handle, it.coroutineContext)
                                it.handle = null
                                launchIfContext(it.coroutineContext) {
                                    it.handleManager.close()
                                }
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

                        // For more accurate memory counting, enforcing GC before commencing.
                        Runtime.getRuntime().gc()
                        Thread.sleep(GcWaitTimeMs)

                        taskManagerEvents.queue.add(
                            TaskEvent(
                                TaskEventId.MEMORY_STATS,
                                0,
                                memoryFootprint.map { (_, v) -> v }
                            )
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

    @ExperimentalCoroutinesApi
    private fun execute(settings: Settings) {
        earlyExit = false
        val numOfTasks =
            settings.numOfListenerThreads +
            settings.numOfWriterThreads +
            if (settings.clearedEntities >= 0) 1 else 0
        val watchdog = Watchdog(settings)

        // Task and handle manager assignments
        controllers = arrayOfNulls(numOfTasks)
        handles = tasks.mapIndexed { id, task ->
            // Per-task single-threaded execution context with Watchdog monitoring instabilities
            val taskCoroutineContext =
                task.asCoroutineDispatcher() +
                if (settings.function == Function.STABILITY_TEST) {
                    stabilityExceptionHandler(id)
                } else {
                    performanceExceptionHandler(id)
                }

            TaskHandle(
                EntityHandleManager(
                    time = JvmTime,
                    stores = StoreManager(
                        activationFactory = ServiceStoreFactory(
                            context,
                            lifecycle,
                            taskCoroutineContext,
                            DefaultConnectionFactory(
                                context,
                                if (settings.function == Function.STABILITY_TEST) {
                                    TestStorageServiceBindingDelegate(context)
                                } else {
                                    DefaultStorageServiceBindingDelegate(context)
                                },
                                taskCoroutineContext
                            )
                        )
                    ),
                    // Per-task single-threaded Scheduler being cascaded with Watchdog capabilities
                    scheduler = JvmSchedulerProvider(taskCoroutineContext)("sysHealthStorageCore")
                ),
                taskCoroutineContext
            ).apply {
                val taskType = when {
                    id < settings.numOfListenerThreads -> TaskType.LISTENER
                    id < settings.numOfListenerThreads + settings.numOfWriterThreads -> TaskType.WRITER
                    else -> TaskType.CLEANER
                }
                tasksEvents[id] = TaskEventQueue(ReentrantReadWriteLock(), mutableListOf())
                controllers[id] = TaskController(
                    id,
                    taskType,
                    settings.function == Function.STABILITY_TEST &&
                    Random.nextInt(0, 100) < settings.storageClientCrashRate,
                    Random.nextInt(0, settings.timesOfIterations),
                    settings.timesOfIterations
                )
                runBlocking {
                    if (taskType == TaskType.CLEANER)
                        setUpCleanerHandle(this@apply, settings)
                    else
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
                    val job = GlobalScope.launch(taskHandle.coroutineContext) {
                        when (ctrl.taskType) {
                            TaskType.LISTENER -> listenerTask(taskHandle, ctrl, settings)
                            TaskType.WRITER -> writerTask(taskHandle, ctrl, settings)
                            TaskType.CLEANER -> cleanerTask(taskHandle, ctrl, settings)
                        }
                    }

                    if (ctrl.shouldCrash && ctrl.crashAtCountDown == thisCountDown) {
                        // Trouble-maker
                        GlobalScope.launch(taskHandle.coroutineContext) {
                            // random crash in several ms
                            delay(Random.nextLong(0, storageClientCrashDelayMs))
                            // Randomly crash StorageService if we are testing stability.
                            job.cancel("causing troubles on a client",
                                       StorageClientCrashException())
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
    private suspend fun setUpCleanerHandle(taskHandle: TaskHandle, settings: Settings) {
        val handle = taskHandle.handleManager.createHandle(
            HandleSpec(
                "CleanerHandle",
                HandleMode.Write,
                CollectionType(EntityType(TestEntity.SCHEMA)),
                TestEntity
            ),
            TestEntity.clearEntitiesTestStorageKey
        ) as ReadWriteCollectionHandle<TestEntity>

        val elapsedTime = measureTimeMillis { handle.awaitReady() }
        if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
            taskManagerEvents.writer.withLock {
                taskManagerEvents.queue.add(
                    TaskEvent(TaskEventId.HANDLE_AWAIT_READY_TIME, elapsedTime))
            }
        }

        taskHandle.handle = handle
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun setUpHandle(
        taskHandle: TaskHandle,
        taskId: Int,
        taskType: TaskType?,
        settings: Settings
    ) = when (settings.handleType) {
        HandleType.SINGLETON -> {
            val handle = taskHandle.handleManager.createHandle(
                HandleSpec(
                    "singletonHandle$taskId",
                    HandleMode.ReadWrite,
                    SingletonType(EntityType(TestEntity.SCHEMA)),
                    TestEntity
                ),
                when (settings.storageMode) {
                    TestEntity.StorageMode.PERSISTENT -> TestEntity.singletonPersistentStorageKey
                    else -> TestEntity.singletonInMemoryStorageKey
                }
            ) as ReadWriteSingletonHandle<TestEntity>

            val elapsedTime = measureTimeMillis { handle.awaitReady() }
            if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
                taskManagerEvents.writer.withLock {
                    taskManagerEvents.queue.add(
                        TaskEvent(TaskEventId.HANDLE_AWAIT_READY_TIME, elapsedTime))
                }
            }

            handle.onUpdate {
                entity ->
                if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
                    val time = System.currentTimeMillis()
                    tasksEvents[taskId]?.writer?.withLock {
                        tasksEvents[taskId]?.queue?.add(
                            TaskEvent(
                                if (taskType == TaskType.WRITER)
                                    TaskEventId.HANDLE_STORE_WRITER_END
                                else
                                    TaskEventId.HANDLE_STORE_READER_END,
                                time,
                                entity?.number
                            )
                        )
                    }
                }
            }

            // The very first SingletonHandle is responsible for writing an entity
            // to storage then creating its reference.
            if (taskId == 0) {
                SystemHealthTestEntity.entityReference = withContext(handle.dispatcher) {
                    handle.store(SystemHealthTestEntity.referencedEntity).join()
                    handle.createReference(SystemHealthTestEntity.referencedEntity).toReferencable()
                }
            }
            taskHandle.handle = handle
        }
        HandleType.COLLECTION -> {
            val handle = taskHandle.handleManager.createHandle(
                HandleSpec(
                    "collectionHandle$taskId",
                    HandleMode.ReadWrite,
                    CollectionType(EntityType(TestEntity.SCHEMA)),
                    TestEntity
                ),
                when (settings.storageMode) {
                    StorageMode.PERSISTENT -> TestEntity.collectionPersistentStorageKey
                    else -> TestEntity.collectionInMemoryStorageKey
                }
            ) as ReadWriteCollectionHandle<TestEntity>

            val elapsedTime = measureTimeMillis { handle.awaitReady() }
            if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
                taskManagerEvents.writer.withLock {
                    taskManagerEvents.queue.add(
                        TaskEvent(TaskEventId.HANDLE_AWAIT_READY_TIME, elapsedTime))
                }
            }

            handle.onUpdate {
                entity ->
                if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
                    val time = System.currentTimeMillis()
                    tasksEvents[taskId]?.writer?.withLock {
                        tasksEvents[taskId]?.queue?.add(
                            TaskEvent(
                                if (taskType == TaskType.WRITER)
                                    TaskEventId.HANDLE_STORE_WRITER_END
                                else
                                    TaskEventId.HANDLE_STORE_READER_END,
                                time,
                                entity.map { it.number }.toSet()
                            )
                        )
                    }
                }
            }

            // The very first CollectionHandle is responsible for writing an entity
            // to storage then creating its reference.
            if (taskId == 0) {
                SystemHealthTestEntity.entityReference = withContext(handle.dispatcher) {
                    handle.store(SystemHealthTestEntity.referencedEntity).join()
                    handle.createReference(SystemHealthTestEntity.referencedEntity).toReferencable()
                }
            }
            taskHandle.handle = handle
        }
    }

    private suspend inline fun <T> closeHandleSuspend(handle: T?) {
        if (handle is Handle) withContext(handle.dispatcher) { handle.close() }
    }

    private fun launchIfContext(
        coroutineContext: CoroutineContext?,
        block: suspend CoroutineScope.() -> Unit
    ) {
        if (coroutineContext == null) {
            runBlocking { block() }
        } else {
            GlobalScope.launch(coroutineContext) { block() }
        }
    }

    private fun <T> closeHandle(
        handle: T?,
        coroutineContext: CoroutineContext? = null
    ) = launchIfContext(coroutineContext) { closeHandleSuspend(handle) }

    private suspend fun listenerTask(
        taskHandle: TaskHandle,
        taskController: TaskController,
        settings: Settings
    ) {
        val timestampStart = System.currentTimeMillis()
        when (val handle = taskHandle.handle) {
            is ReadWriteSingletonHandle<*> -> withContext(handle.dispatcher) {
                handle.fetch()
            }
            is ReadWriteCollectionHandle<*> -> withContext(handle.dispatcher) {
                handle.fetchAll()
            }
        }
        val timeElapsed = System.currentTimeMillis() - timestampStart
        if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
            tasksEvents[taskController.taskId]?.writer?.withLock {
                tasksEvents[taskController.taskId]?.queue?.add(
                    TaskEvent(TaskEventId.HANDLE_FETCH_LATENCY, timeElapsed)
                )
            }

            SystemHealthTestEntity.entityReference?.let {
                val elapsedTime = measureTimeMillis { it.dereference() }
                tasksEvents[taskController.taskId]?.writer?.withLock {
                    tasksEvents[taskController.taskId]?.queue?.add(
                        TaskEvent(TaskEventId.DEREFERENCE_LATENCY, elapsedTime)
                    )
                }
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
                    TaskEvent(
                        TaskEventId.HANDLE_STORE_BEGIN, System.currentTimeMillis(), entity.number)
                )
            }
        }

        when (val handle = taskHandle.handle) {
            is ReadWriteSingletonHandle<*> -> (
                handle as? ReadWriteSingletonHandle<TestEntity>
                )?.let {
                    withContext(it.dispatcher) { it.store(entity) }.join()
                }
            is ReadWriteCollectionHandle<*> -> (
                handle as? ReadWriteCollectionHandle<TestEntity>
                )?.let {
                    withContext(it.dispatcher) { it.store(entity) }.join()
                }
            else -> Unit
        }
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun cleanerTask(
        taskHandle: TaskHandle,
        taskController: TaskController,
        settings: Settings
    ) = (taskHandle.handle as? ReadWriteCollectionHandle<TestEntity>)?.let { handle ->
        val entities = List(settings.clearedEntities) {
            SystemHealthTestEntity(settings.dataSizeInBytes)
        }

        if (entities.isNotEmpty()) {
            withContext(handle.dispatcher) {
                entities.map { handle.store(it) }
            }.joinAll()
            handle.getProxy().waitForIdle()
        }

        val elapsedTime = measureTimeMillis {
            // Wait until all client side jobs get done i.e. the op gets sent to
            // outgoing channel and handled at ServiceStore's onProxyMessage.
            withContext(handle.dispatcher) { handle.clear() }.join()
        }

        if (settings.function == Function.LATENCY_BACKPRESSURE_TEST) {
            tasksEvents[taskController.taskId]?.writer?.withLock {
                tasksEvents[taskController.taskId]?.queue?.add(
                    TaskEvent(TaskEventId.HANDLE_CLEAR_LATENCY, elapsedTime)
                )
            }
        }
    }

    private fun performanceExceptionHandler(taskId: Int) =
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
                    taskManagerEvents.queue.add(
                        TaskEvent(TaskEventId.EXCEPTION, timestamp, desc = msg))
                }

                // Cancel all pending tasks and forbid new tasks.
                controllers.getOrNull(taskId)?.future?.cancel(false)
            }

            // Don't ignore the exception being received.
            // The single task thread will be terminated upon the unhandled exception.
            throw exception
        }

    private fun stabilityExceptionHandler(taskId: Int) =
        CoroutineExceptionHandler { _, exception ->

            if (exception !is StorageClientCrashException) {
                val timestamp = System.currentTimeMillis()
                val taskType = controllers.getOrNull(taskId)?.taskType?.name ?: ""
                val msg = "$taskType #$taskId: $exception"
                taskManagerEvents.writer.withLock {
                    taskManagerEvents.queue.add(
                        TaskEvent(TaskEventId.EXCEPTION, timestamp, desc = msg))
                }

                // Cancel all pending tasks and forbid new tasks.
                controllers.getOrNull(taskId)?.future?.cancel(false)

                earlyExit = true
            }

            // Cancel this thread.
            throw InterruptedException()
        }

    private inner class Watchdog(val settings: Settings) {

        fun monitor() = tasks.takeIf { it.isNotEmpty() }.run {
            // All tasks should run fairly under CFS kernel policy.
            val awaitTimeMs =
                (settings.iterationIntervalMs + systemHzTickMs) * settings.timesOfIterations
            val progressUpdateTimes = ceil(awaitTimeMs / progressUpdateIntervalMs)
            for (progress in 0 until progressUpdateTimes.toInt()) {
                notify { "Progress: %.2f%%".format(progress * 100 / progressUpdateTimes) }
                tasks[Random.nextInt(0, tasks.size)].awaitTermination(
                    progressUpdateIntervalMs.toLong(), MILLISECONDS
                )

                if (settings.function == Function.STABILITY_TEST) {
                    // If we already caught any crash, exit.
                    if (earlyExit) {
                        break
                    }
                    // Randomly crash StorageService if we are testing stability.
                    maybeCrashStorageService(settings.storageServiceCrashRate)
                }

                // Dump and system-trace memory footprint.
                memoryFootprint
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
            // Close all Handles and EntityHandleManagers
            // TODO: remove this when terminated() works to clean up?
            handles.forEach {
                runBlocking {
                    it.handleManager.close()
                }
            }
            handles = emptyArray()
            populateStatsBulletin()
        }
    }

    private fun maybeCrashStorageService(rate: Int) {
        if (Random.nextInt(0, 100) < rate) {
            context.startService(TestStorageService.createCrashIntent(context))
        }
    }

    private fun populateStatsBulletin() {
        val stats = Stats()
            .generateHandleFetchLatencyStats()
            .generateHandleStoreLatencyStats()
            .generateHandleClearLatencyStats()
            .generateWriteToReadTripLatencyStats()
            .generateDereferenceLatencyStats()
            .generateHandleAwaitReadyTimeStats()
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
                        events.queue.filter {
                            it.eventId == TaskEventId.HANDLE_FETCH_LATENCY }.map { it.timeMs }
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
                        events.queue.filter { it.eventId == TaskEventId.HANDLE_STORE_WRITER_END }
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

        @Suppress("UnstableApiUsage")
        fun generateHandleClearLatencyStats(): Stats = also {
            val calculator = StatsAccumulator()

            tasksEvents.forEach { _, events ->
                events.reader.withLock {
                    calculator.addAll(
                        events.queue.filter {
                            it.eventId == TaskEventId.HANDLE_CLEAR_LATENCY }.map { it.timeMs }
                    )
                }
            }

            calculator.takeIf { it.count() > 0 }?.let {
                bulletin +=
                    """
                    [clear() latency on ${settings.clearedEntities} entities]
                    ${calculator.snapshot()}
                    ${platformNewline.repeat(1)}
                    """.trimIndent()
            }
        }

        @Suppress("UnstableApiUsage")
        fun generateWriteToReadTripLatencyStats(): Stats = also {
            val calculator = StatsAccumulator()
            val historyMap = mutableMapOf<Double, Pair<MutableList<Long>, MutableList<Long>>>()

            // TODO(ianchang): Support Collection handles
            tasksEvents.forEach { _, events ->
                events.reader.withLock {
                    events.queue.filter {
                        it.eventId == TaskEventId.HANDLE_STORE_BEGIN && it.instance is Double
                    }.forEach {
                        historyMap.getOrPut(it.instance as Double) {
                            Pair(mutableListOf(), mutableListOf())
                        }.first.add(it.timeMs)
                    }

                    events.queue.filter {
                        it.eventId == TaskEventId.HANDLE_STORE_READER_END && it.instance is Double
                    }.forEach {
                        historyMap.getOrPut(it.instance as Double) {
                            Pair(mutableListOf(), mutableListOf())
                        }.second.add(it.timeMs)
                    }
                }
            }

            historyMap.filterValues { (writers, _) -> writers.size == 1
            }.forEach { _, (writers, readers) ->
                calculator.addAll(readers.map { it - writers[0] })
            }

            calculator.takeIf { it.count() > 0 }?.let {
                bulletin +=
                    """
                    [writer-to-reader latency]
                    ${calculator.snapshot()}
                    ${platformNewline.repeat(1)}
                    """.trimIndent()
            }
        }

        @Suppress("UnstableApiUsage")
        fun generateDereferenceLatencyStats(): Stats = also {
            val calculator = StatsAccumulator()

            tasksEvents.forEach { _, events ->
                events.reader.withLock {
                    calculator.addAll(
                        events.queue
                            .filter { it.eventId == TaskEventId.DEREFERENCE_LATENCY }
                            .map { it.timeMs }
                    )
                }
            }

            calculator.takeIf { it.count() > 0 }?.let {
                bulletin +=
                    """
                    [dereference() latency]
                    ${calculator.snapshot()}
                    ${platformNewline.repeat(1)}
                    """.trimIndent()
            }
        }

        @Suppress("UnstableApiUsage")
        fun generateHandleAwaitReadyTimeStats(): Stats = also {
            val calculator = StatsAccumulator()

            taskManagerEvents.reader.withLock {
                calculator.addAll(
                    taskManagerEvents.queue.filter {
                        it.eventId == TaskEventId.HANDLE_AWAIT_READY_TIME
                    }.map { it.timeMs }
                )
            }

            calculator.takeIf { it.count() > 0 }?.let {
                bulletin +=
                    """
                    [awaitReady() time]
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
            var memInitial: List<Long>? = null
            taskManagerEvents.reader.withLock {
                // [0]: appJvmHeapKbytes
                // [1]: appNativeHeapKbytes
                // [2]: allHeapsKbytes
                memInitial = (taskManagerEvents.queue.filter {
                    it.eventId == TaskEventId.MEMORY_STATS
                }.first().instance as? List<*>)?.filterIsInstance<Long>()?.takeIf { it.size == 3 }
            }

            tasksEvents.forEach { _, taskEvents ->
                taskEvents.writer.withLock { taskEvents.queue.clear() }
            }
            taskManagerEvents.writer.withLock { taskManagerEvents.queue.clear() }

            memInitial?.let {
                val formatter = DecimalFormat("+#;-#")
                val hprofFilePath = context.applicationInfo.dataDir + "/" + hprofFile
                val (appJvmHeapBeforeGc, appNativeHeapBeforeGc, allHeapsBeforeGc) =
                    memoryFootprint.map { (_, v) -> v }

                for (i in 1..2) {
                    // Whether gc or not is not guaranteed, synchronous or asynchronous gc is also
                    // JVM implementation-dependent.
                    Runtime.getRuntime().gc()
                    Thread.sleep(GcWaitTimeMs)
                }

                val (appJvmHeapAfterGc, appNativeHeapAfterGc, allHeapsAfterGc) =
                    memoryFootprint.map { (_, v) -> v }
                bulletin +=
                    """
                    |[Memory Stats]
                    |Private-dirty dalvik heap (before GC): ${
                        formatter.format(appJvmHeapBeforeGc - it[0]) } KB
                    |Private-dirty dalvik heap (after GC): ${
                        formatter.format(appJvmHeapAfterGc - it[0]) } KB
                    |Private-dirty native heap (before GC): ${
                        formatter.format(appNativeHeapBeforeGc - it[1]) } KB
                    |Private-dirty native heap (after GC): ${
                        formatter.format(appNativeHeapAfterGc - it[1]) } KB
                    |All(dalvik+native) heaps (before GC): ${
                        formatter.format(allHeapsBeforeGc - it[2]) } KB
                    |All(dalvik+native) heaps (after GC): ${
                        formatter.format(allHeapsAfterGc - it[2]) } KB
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
        val taskType: TaskType,
        val shouldCrash: Boolean,
        val crashAtCountDown: Int,
        var countDown: Int,
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
        CLEANER,
    }

    private enum class TaskEventId {
        HANDLE_STORE_BEGIN,
        HANDLE_STORE_WRITER_END,
        HANDLE_STORE_READER_END,
        HANDLE_FETCH_LATENCY,
        HANDLE_CLEAR_LATENCY,
        HANDLE_AWAIT_READY_TIME,
        DEREFERENCE_LATENCY,
        MEMORY_STATS,
        EXCEPTION,
        TIMEOUT,
        ANOMALY,
    }

    companion object {
        private const val waitForPrevTaskShutdownMs = 500L
        private const val waitForDataSyncUpMs = 1000L
        private const val systemHzTickMs = 10L
        private const val watchdogExtraWaitTimeMs = 1000L
        private const val GcWaitTimeMs = 1500L
        private const val progressUpdateIntervalMs = 1000f
        private const val hprofFile = "arcs.hprof"
        private const val storageClientCrashDelayMs = 5L
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

    /** For benchmarking [Reference] latency. */
    val referencedEntity = TestEntity(
        text = "__unused__",
        number = 0.0,
        boolean = false,
        id = "foo"
    )
    var entityReference: Reference? = null

    operator fun invoke(size: Int = 64) = TestEntity(
        // 16 = 4 ('true') + 12 ('1.xxxxxxx1E8')
        text = allChars[seqNo.value % allChars.size].toString().repeat(size - 16),
        // The atomic number is also treated as unique data id to pair round-trips.
        number = BASE_SEQNO + seqNo.getAndIncrement().toDouble() * 10,
        boolean = BASE_BOOLEAN,
        reference = entityReference
    )
}

/** Enclosing class for all enums being used during system health tests. */
class SystemHealthEnums {
    enum class Function(val intent: String = "") {
        STOP,
        LATENCY_BACKPRESSURE_TEST,
        STABILITY_TEST,
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
        val clearedEntities: String = "cleared_entities",
        val delayedStartMs: String = "delayed_start_ms",
        val storageServiceCrashRate: String = "storage_service_crash_rate",
        val storageClientCrashRate: String = "storage_client_crash_rate",
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
        val clearedEntities: Int = 0,
        val delayedStartMs: Int = 0,
        val storageServiceCrashRate: Int = 10,
        val storageClientCrashRate: Int = 10,
        val useRandomStorageKey: Boolean = false
    )
}

private class StorageClientCrashException: IllegalStateException()
