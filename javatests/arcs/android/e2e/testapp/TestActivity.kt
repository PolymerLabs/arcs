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

package arcs.android.e2e.testapp

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.RadioButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import arcs.android.host.AndroidManifestHostRegistry
import arcs.core.allocator.Allocator
import arcs.core.data.HandleMode
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.host.EntityHandleManager
import arcs.jvm.util.JvmTime
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/** Entry UI to launch Arcs Test. */
class TestActivity : AppCompatActivity() {

    private lateinit var resultView1: TextView
    private lateinit var resultView2: TextView

    private var result1 = ""
    private var result2 = ""

    private val coroutineContext: CoroutineContext = Job() + Dispatchers.Main
    private val scope: CoroutineScope = CoroutineScope(coroutineContext)
    private var storageMode = TestEntity.StorageMode.IN_MEMORY
    private var isCollection = false
    private var setFromRemoteService = false
    private var singletonHandle: ReadWriteSingletonHandle<TestEntity>? = null
    private var collectionHandle: ReadWriteCollectionHandle<TestEntity>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.test_activity)
        resultView1 = findViewById<Button>(R.id.result1)
        resultView2 = findViewById<Button>(R.id.result2)

        findViewById<Button>(R.id.create).setOnClickListener {
            scope.launch {
                createHandle()
            }
        }
        findViewById<Button>(R.id.fetch).setOnClickListener {
            scope.launch {
                fetchHandle()
            }
        }
        findViewById<Button>(R.id.set).setOnClickListener {
            scope.launch {
                setHandle()
            }
        }
        findViewById<Button>(R.id.clear).setOnClickListener {
            scope.launch {
                clearHandle()
            }
        }

        findViewById<RadioButton>(R.id.singleton).setOnClickListener(::onTestOptionClicked)
        findViewById<RadioButton>(R.id.collection).setOnClickListener(::onTestOptionClicked)
        findViewById<RadioButton>(R.id.in_memory).setOnClickListener(::onTestOptionClicked)
        findViewById<RadioButton>(R.id.persistent).setOnClickListener(::onTestOptionClicked)
        findViewById<RadioButton>(R.id.local).setOnClickListener(::onTestOptionClicked)
        findViewById<RadioButton>(R.id.remote).setOnClickListener(::onTestOptionClicked)
        findViewById<Button>(R.id.person_test).setOnClickListener {
            scope.launch {
                runPersonRecipe()
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)

        intent?.run {
            if (intent.hasExtra(RESULT_NAME)) {
                scope.launch {
                    appendResultText(intent.getStringExtra(RESULT_NAME))
                }
            }
        }
    }

    override fun onDestroy() {
        val intent = Intent(
            this, StorageAccessService::class.java
        )
        stopService(intent)
        scope.cancel()
        super.onDestroy()
    }

    private suspend fun runPersonRecipe() {
        appendResultText(getString(R.string.waiting_for_result))
        val allocator = Allocator.create(
            AndroidManifestHostRegistry.create(this@TestActivity),
            EntityHandleManager(
                time = JvmTime,
                activationFactory = ServiceStoreFactory(
                    context = this@TestActivity,
                    lifecycle = this@TestActivity.lifecycle
                )
            )
        )
        val arcId = allocator.startArcForPlan("Person", PersonRecipePlan)
        allocator.stopArc(arcId)
    }

    private fun onTestOptionClicked(view: View) {
        if (view is RadioButton && view.isChecked) {
            when (view.getId()) {
                R.id.singleton -> isCollection = false
                R.id.collection -> isCollection = true
                R.id.in_memory -> storageMode = TestEntity.StorageMode.IN_MEMORY
                R.id.persistent -> storageMode = TestEntity.StorageMode.PERSISTENT
                R.id.local -> setFromRemoteService = false
                R.id.remote -> setFromRemoteService = true
            }
        }
    }

    private suspend fun createHandle() {
        singletonHandle?.close()
        collectionHandle?.close()

        appendResultText(getString(R.string.waiting_for_result))

        val handleManager = EntityHandleManager(
            time = JvmTime,
            activationFactory = ServiceStoreFactory(
                this,
                lifecycle
            )
        )
        if (isCollection) {
            collectionHandle = handleManager.createHandle(
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
            ) as ReadWriteCollectionHandle<TestEntity>


            collectionHandle?.onReady {
                scope.launch {
                    fetchAndUpdateResult("onReady")
                }
            }

            collectionHandle?.onUpdate {
                scope.launch {
                    fetchAndUpdateResult("onUpdate")
                }
            }

            collectionHandle?.onDesync {
                scope.launch {
                    fetchAndUpdateResult("onDesync")
                }
            }

            collectionHandle?.onResync {
                scope.launch {
                    fetchAndUpdateResult("onResync")
                }
            }
        } else {
            singletonHandle = handleManager.createHandle(
                HandleSpec(
                    "singletonHandle",
                    HandleMode.ReadWrite,
                    HandleContainerType.Singleton,
                    TestEntity
                ),
                when (storageMode) {
                    TestEntity.StorageMode.PERSISTENT -> TestEntity.singletonPersistentStorageKey
                    else -> TestEntity.singletonInMemoryStorageKey
                }
            ) as ReadWriteSingletonHandle<TestEntity>

            singletonHandle?.onReady {
                scope.launch {
                    fetchAndUpdateResult("onReady")
                }
            }

            singletonHandle?.onUpdate {
                scope.launch {
                    fetchAndUpdateResult("onUpdate")
                }
            }

            singletonHandle?.onResync{
                scope.launch {
                    fetchAndUpdateResult("onResync")
                }
            }

            singletonHandle?.onDesync {
                scope.launch {
                    fetchAndUpdateResult("onDesync")
                }
            }
        }
    }

    private suspend fun fetchHandle() {
        fetchAndUpdateResult("Fetch")
    }

    private suspend fun setHandle() {
        if (setFromRemoteService) {
            val intent = Intent(
                this, StorageAccessService::class.java
            )
            intent.putExtra(
                StorageAccessService.IS_COLLECTION_EXTRA, isCollection
            )
            intent.putExtra(
                StorageAccessService.STORAGE_MODE_EXTRA, storageMode.ordinal
            )
            intent.putExtra(
                StorageAccessService.HANDLE_ACTION_EXTRA, StorageAccessService.Action.SET.ordinal
            )
            startService(intent)
        } else {
            if (isCollection) {
                for (i in 0 until 2) {
                    collectionHandle?.store(
                        TestEntity(
                            text = TestEntity.text,
                            number = i.toDouble(),
                            boolean = TestEntity.boolean
                        )
                    )
                }
            } else {
                singletonHandle?.store(
                    TestEntity(
                        text = TestEntity.text,
                        number = TestEntity.number,
                        boolean = TestEntity.boolean
                    )
                )
            }
        }
    }

    private suspend fun clearHandle() {
        if (setFromRemoteService) {
            val intent = Intent(
                this, StorageAccessService::class.java
            )
            intent.putExtra(
                StorageAccessService.IS_COLLECTION_EXTRA, isCollection
            )
            intent.putExtra(
                StorageAccessService.HANDLE_ACTION_EXTRA, StorageAccessService.Action.CLEAR.ordinal
            )
            intent.putExtra(
                StorageAccessService.STORAGE_MODE_EXTRA, storageMode.ordinal
            )
            startService(intent)
        } else {
            singletonHandle?.clear()
            collectionHandle?.clear()
        }
    }

    private suspend fun fetchAndUpdateResult(prefix: String) {
        var result: String? = "null"
        if (isCollection) {
            val testEntities = collectionHandle?.fetchAll()
            if (!testEntities.isNullOrEmpty()) {
                result = testEntities
                    .sortedBy { it.number }
                    .joinToString(separator = ";") { "${it.text},${it.number},${it.boolean}" }
            }
        } else {
            val testEntity = singletonHandle?.fetch()
            result = testEntity?.let {
                "${it.text},${it.number},${it.boolean}"
            }
        }
        appendResultText("$prefix:$result")
    }

    private fun appendResultText(result: String) {
        result1 = result2
        result2 = result
        resultView1.text = "1: $result1"
        resultView2.text = "2: $result2"
    }

    companion object {
        const val RESULT_NAME = "result"
    }
}
