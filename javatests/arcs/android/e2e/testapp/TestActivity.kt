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

    /**
     * Recipe hand translated from 'person.arcs'
     */
    private lateinit var resultView: TextView

    private val coroutineContext: CoroutineContext = Job() + Dispatchers.Main
    private val scope: CoroutineScope = CoroutineScope(coroutineContext)
    private var storageMode = TestEntity.StorageMode.IN_MEMORY
    private var setFromRemoteService = false
    private var singletonHandle: ReadWriteSingletonHandle<TestEntity>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.test_activity)
        resultView = findViewById<Button>(R.id.result)

        findViewById<Button>(R.id.create).setOnClickListener {
            scope.launch {
                createHandle()
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

        findViewById<RadioButton>(R.id.in_memory).setOnClickListener {
            v -> onTestOptionClicked(v)
        }
        findViewById<RadioButton>(R.id.persistent).setOnClickListener {
            v -> onTestOptionClicked(v)
        }
        findViewById<RadioButton>(R.id.local).setOnClickListener {
            v -> onTestOptionClicked(v)
        }
        findViewById<RadioButton>(R.id.remote).setOnClickListener {
            v -> onTestOptionClicked(v)
        }
        findViewById<Button>(R.id.person_test).setOnClickListener {
            scope.launch {
                runPersonRecipe()
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)

        intent?.run {
            scope.launch {
                resultView.text = intent.getStringExtra(RESULT_NAME)
            }
        }
    }

    override fun onStop() {
        scope.launch {
            singletonHandle?.close()
        }

        super.onStop()
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
                R.id.in_memory -> storageMode = TestEntity.StorageMode.IN_MEMORY
                R.id.persistent -> storageMode = TestEntity.StorageMode.PERSISTENT
                R.id.local -> setFromRemoteService = false
                R.id.remote -> setFromRemoteService = true
            }
        }
    }

    private suspend fun createHandle() {
        singletonHandle?.close()

        val handleManager = EntityHandleManager(
            time = JvmTime,
            activationFactory = ServiceStoreFactory(
                this,
                lifecycle
            )
        )
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

        singletonHandle?.onUpdate {
            scope.launch {
                updateTestResult("onUpdate")
            }
        }

        singletonHandle?.onSync {
            scope.launch {
                updateTestResult("onSync")
            }
        }

        singletonHandle?.onDesync {
            scope.launch {
                updateTestResult("onDesync")
            }
        }
    }

    private suspend fun setHandle() {
        if (setFromRemoteService) {
            val intent = Intent(
                this, StorageAccessService::class.java
            )
            intent.putExtra(
                StorageAccessService.storageModeExtra, storageMode.ordinal
            )
            intent.putExtra(
                StorageAccessService.handleActionExtra, StorageAccessService.Action.SET.ordinal
            )
            startService(intent)
        } else {
            val newTestEntity = TestEntity(
                text = TestEntity.text,
                number = TestEntity.number,
                boolean = TestEntity.boolean
            )

            singletonHandle?.store(newTestEntity)
        }
    }

    private suspend fun clearHandle() {
        if (setFromRemoteService) {
            val intent = Intent(
                this, StorageAccessService::class.java
            )
            intent.putExtra(
                StorageAccessService.handleActionExtra, StorageAccessService.Action.CLEAR.ordinal
            )
            intent.putExtra(
                StorageAccessService.storageModeExtra, storageMode.ordinal
            )
            startService(intent)
        } else {
            singletonHandle?.clear()
        }
    }

    private suspend fun updateTestResult(prefix: String) {
        val person = singletonHandle?.fetch()
        resultView.text = person?.let {
            "$prefix:${it.text},${it.number},${it.boolean}"
        } ?: "$prefix:null"
    }

    companion object {
        const val RESULT_NAME = "result"
    }
}
