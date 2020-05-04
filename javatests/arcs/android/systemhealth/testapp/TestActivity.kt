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

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.RadioButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import arcs.core.data.HandleMode
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.ReadCollectionHandle
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle
import arcs.sdk.android.storage.ServiceStoreFactory
import java.util.concurrent.Executors
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

/** Test app for Arcs System Health. */
class TestActivity : AppCompatActivity() {
    private lateinit var resultTextView: TextView

    private val coroutineContext: CoroutineContext =
        Executors.newSingleThreadExecutor().asCoroutineDispatcher()
    private val scope: CoroutineScope = CoroutineScope(coroutineContext)
    private val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
    private lateinit var handleManager: EntityHandleManager

    private var handleType = SystemHealthEnums.HandleType.SINGLETON
    private var storageMode = TestEntity.StorageMode.IN_MEMORY
    private var serviceType = SystemHealthEnums.ServiceType.LOCAL
    private var singletonHandle: ReadWriteSingletonHandle<TestEntity>? = null
    private var collectionHandle: ReadWriteCollectionHandle<TestEntity>? = null
    private var numOfListenerThreads: Int
    private var numOfWriterThreads: Int
    private var iterationIntervalMs: Int
    private var timesOfIterations: Int
    private var dataSizeInBytes: Int
    private var delayedStartMs: Int
    private var intentReceiver: BroadcastReceiver? = null

    init {
        // Supply the default settings being displayed on UI at app. startup.
        SystemHealthData.Settings().let {
            numOfListenerThreads = it.numOfListenerThreads
            numOfWriterThreads = it.numOfWriterThreads
            iterationIntervalMs = it.iterationIntervalMs
            timesOfIterations = it.timesOfIterations
            dataSizeInBytes = it.dataSizeInBytes
            delayedStartMs = it.delayedStartMs
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.test_activity)

        handleManager = EntityHandleManager(
            time = JvmTime,
            scheduler = schedulerProvider("sysHealthTestActivity"),
            activationFactory = ServiceStoreFactory(
                this,
                lifecycle,
                coroutineContext
            )
        )

        resultTextView = findViewById(R.id.result)

        findViewById<Button>(R.id.fetch).apply {
            setOnClickListener {
                when (handleType) {
                    SystemHealthEnums.HandleType.SINGLETON ->
                        withHandle<ReadWriteSingletonHandle<TestEntity>> {
                            fetchSingletonAndShow(it, "fetch")
                        }
                    else ->
                        withHandle<ReadWriteCollectionHandle<TestEntity>> {
                            fetchCollectionAndShow(it, "fetch")
                        }
                }
            }
        }
        findViewById<Button>(R.id.set).apply {
            setOnClickListener {
                when (handleType) {
                    SystemHealthEnums.HandleType.SINGLETON ->
                        withHandle<ReadWriteSingletonHandle<TestEntity>> {
                            it?.store(SystemHealthTestEntity())?.join()
                        }
                    else ->
                        withHandle<ReadWriteCollectionHandle<TestEntity>> {
                            it?.store(SystemHealthTestEntity())?.join()
                        }
                }
            }
        }
        findViewById<Button>(R.id.clear).apply {
            setOnClickListener {
                when (handleType) {
                    SystemHealthEnums.HandleType.SINGLETON ->
                        withHandle<ReadWriteSingletonHandle<TestEntity>> {
                            it?.clear()
                        }
                    else ->
                        withHandle<ReadWriteCollectionHandle<TestEntity>> {
                            it?.clear()
                        }
                }
            }
        }
        findViewById<Button>(R.id.close).apply {
            setOnClickListener {
                runBlocking(coroutineContext) {
                    when (handleType) {
                        SystemHealthEnums.HandleType.SINGLETON -> {
                            singletonHandle?.close()
                            singletonHandle = null
                        }
                        else -> {
                            collectionHandle?.close()
                            collectionHandle = null
                        }
                    }
                }
            }
        }

        arrayOf<View>(
            findViewById<RadioButton>(R.id.singleton),
            findViewById<RadioButton>(R.id.collection),
            findViewById<RadioButton>(R.id.in_memory),
            findViewById<RadioButton>(R.id.persistent),
            findViewById<RadioButton>(R.id.syshealth_service_local),
            findViewById<RadioButton>(R.id.syshealth_service_remote)
        ).forEach { it.setOnClickListener { onTestOptionClicked(it) } }

        findViewById<TextView>(R.id.listeners).also {
            it.text = numOfListenerThreads.toString()
        }.addTextChangedListener(
            SystemHealthTextWatch {
                numOfListenerThreads = it.toIntOrNull() ?: numOfListenerThreads
            }
        )
        findViewById<TextView>(R.id.writers).also {
            it.text = numOfWriterThreads.toString()
        }.addTextChangedListener(
            SystemHealthTextWatch {
                numOfWriterThreads = it.toIntOrNull() ?: numOfWriterThreads
            }
        )
        findViewById<TextView>(R.id.iterations).also {
            it.text = timesOfIterations.toString()
        }.addTextChangedListener(
            SystemHealthTextWatch {
                timesOfIterations = it.toIntOrNull() ?: timesOfIterations
            }
        )
        findViewById<TextView>(R.id.interval).also {
            it.text = iterationIntervalMs.toString()
        }.addTextChangedListener(
            SystemHealthTextWatch {
                iterationIntervalMs = it.toIntOrNull() ?: iterationIntervalMs
            }
        )
        findViewById<TextView>(R.id.data_size_bytes).also {
            it.text = dataSizeInBytes.toString()
        }.addTextChangedListener(
            SystemHealthTextWatch {
                dataSizeInBytes = it.toIntOrNull()?.takeIf {
                    it >= SystemHealthTestEntity.BASE_BOOLEAN.toString().length +
                    SystemHealthTestEntity.BASE_SEQNO.toString().length
                } ?: dataSizeInBytes
            }
        )
        findViewById<TextView>(R.id.delayed_start_ms).also {
            it.text = delayedStartMs.toString()
        }.addTextChangedListener(
            SystemHealthTextWatch {
                delayedStartMs = it.toIntOrNull() ?: delayedStartMs
            }
        )

        // Listen to the broadcasts sent from remote/local system-health service
        // so as to display the enclosing messages on UI.
        intentReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                intent.getStringExtra(SystemHealthEnums.Function.SHOW_RESULTS.name)?.let { results ->
                    resultTextView.text = results
                }
            }
        }.also {
            registerReceiver(
                it,
                IntentFilter().apply {
                    addAction(SystemHealthEnums.Function.SHOW_RESULTS.intent)
                }
            )
        }

        findViewById<Button>(R.id.performance_eval).setOnClickListener {
            SystemHealthData.IntentExtras().let {
                val intent = Intent(
                    this@TestActivity,
                    when (serviceType) {
                        SystemHealthEnums.ServiceType.REMOTE -> RemoteService::class.java
                        else -> LocalService::class.java
                    }
                )
                intent.putExtra(it.function, SystemHealthEnums.Function.LATENCY_BACKPRESSURE_TEST.name)
                intent.putExtra(it.handleType, handleType.name)
                intent.putExtra(it.storage_mode, storageMode.name)
                intent.putExtra(it.numOfListenerThreads, numOfListenerThreads)
                intent.putExtra(it.numOfWriterThreads, numOfWriterThreads)
                intent.putExtra(it.iterationIntervalMs, iterationIntervalMs)
                intent.putExtra(it.timesOfIterations, timesOfIterations)
                intent.putExtra(it.dataSizeInBytes, dataSizeInBytes)
                intent.putExtra(it.delayedStartMs, delayedStartMs)

                startService(intent)
            }
        }
    }

    override fun onDestroy() {
        intentReceiver?.let {
            unregisterReceiver(it)
        }

        runBlocking(coroutineContext) {
            singletonHandle?.close()
            collectionHandle?.close()
        }

        scope.cancel()
        super.onDestroy()
    }

    private fun onTestOptionClicked(view: View) {
        if (view is RadioButton && view.isChecked) {
            when (view.id) {
                R.id.singleton -> handleType = SystemHealthEnums.HandleType.SINGLETON
                R.id.collection -> handleType = SystemHealthEnums.HandleType.COLLECTION
                R.id.in_memory -> storageMode = TestEntity.StorageMode.IN_MEMORY
                R.id.persistent -> storageMode = TestEntity.StorageMode.PERSISTENT
                R.id.syshealth_service_local -> serviceType = SystemHealthEnums.ServiceType.LOCAL
                R.id.syshealth_service_remote -> serviceType = SystemHealthEnums.ServiceType.REMOTE
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    private inline fun <reified T> withHandle(crossinline block: suspend (T?) -> Unit) {
        scope.launch {
            when (T::class) {
                ReadWriteSingletonHandle::class -> {
                    if (singletonHandle == null) {
                        val handle = handleManager.createHandle(
                            HandleSpec(
                                "singletonHandle",
                                HandleMode.ReadWrite,
                                HandleContainerType.Singleton,
                                TestEntity.Companion
                            ),
                            when (storageMode) {
                                TestEntity.StorageMode.PERSISTENT -> TestEntity.singletonPersistentStorageKey
                                else -> TestEntity.singletonInMemoryStorageKey
                            }
                        ).awaitReady() as ReadWriteSingletonHandle<TestEntity>

                        singletonHandle = handle.apply {
                            onReady {
                                scope.launch { fetchSingletonAndShow(this@apply, "onReady") }
                            }

                            onUpdate {
                                scope.launch { fetchSingletonAndShow(this@apply, "onUpdate") }
                            }

                            onDesync {
                                scope.launch { fetchSingletonAndShow(this@apply, "onDesync") }
                            }

                            onResync {
                                scope.launch { fetchSingletonAndShow(this@apply, "onResync") }
                            }
                        }
                    }
                    block(singletonHandle as? T)
                }
                ReadWriteCollectionHandle::class -> {
                    if (collectionHandle == null) {
                        val handle = handleManager.createHandle(
                            HandleSpec(
                                "collectionHandle",
                                HandleMode.ReadWrite,
                                HandleContainerType.Collection,
                                TestEntity.Companion
                            ),
                            when (storageMode) {
                                TestEntity.StorageMode.PERSISTENT -> TestEntity.collectionPersistentStorageKey
                                else -> TestEntity.collectionInMemoryStorageKey
                            }
                        ).awaitReady() as ReadWriteCollectionHandle<TestEntity>

                        collectionHandle = handle.apply {
                            onReady {
                                scope.launch { fetchCollectionAndShow(this@apply, "onReady") }
                            }

                            onUpdate {
                                scope.launch { fetchCollectionAndShow(this@apply, "onUpdate") }
                            }

                            onDesync {
                                scope.launch { fetchCollectionAndShow(this@apply, "onDesync") }
                            }

                            onResync {
                                scope.launch { fetchCollectionAndShow(this@apply, "onResync") }
                            }
                        }
                    }
                    block(collectionHandle as? T)
                }
            }
        }
    }

    @Suppress("SetTextI18n")
    private suspend fun fetchSingletonAndShow(
        handle: ReadSingletonHandle<TestEntity>?,
        prefix: String = "?"
    ) {
        val result = handle?.fetch()?.let {
            "${it.text},${it.number},${it.boolean}"
        } ?: "null"

        // Update UI components at the Main/UI Thread.
        scope.launch(Dispatchers.Main) {
            resultTextView.text = "$prefix: $result"
        }
    }

    @Suppress("SetTextI18n")
    private suspend fun fetchCollectionAndShow(
        handle: ReadCollectionHandle<TestEntity>?,
        prefix: String = "?"
    ) {
        val result = handle?.fetchAll()?.takeIf {
            it.isNotEmpty()
        }?.joinToString(separator = System.getProperty("line.separator") ?: "\r\n") {
            "${it.text},${it.number},${it.boolean}"
        } ?: "empty"

        // Update UI components at the Main/UI Thread.
        scope.launch(Dispatchers.Main) {
            resultTextView.text = "$prefix: $result"
        }
    }
}

/** Watch changes of system health test options. */
private class SystemHealthTextWatch(val updater: (String) -> Unit) : TextWatcher {
    override fun beforeTextChanged(s: CharSequence, start: Int, count: Int, after: Int) {}
    override fun afterTextChanged(s: Editable) {}
    override fun onTextChanged(s: CharSequence, start: Int, before: Int, count: Int) {
        updater(s.toString())
    }
}
