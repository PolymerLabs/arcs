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

// TODO(b/170962663) Disabled due to different ordering after copybara transformations.
/* ktlint-disable import-ordering */
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.view.View
import android.widget.Button
import android.widget.RadioButton
import android.widget.TextView
import arcs.android.devtools.DevToolsStarter
import arcs.android.labs.host.AndroidManifestHostRegistry
import arcs.core.allocator.Allocator
import arcs.core.common.ArcId
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.entity.HandleSpec
import arcs.core.entity.awaitReady
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SimpleSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

/** Entry UI to launch Arcs Test. */
@OptIn(ExperimentalCoroutinesApi::class)
class TestActivity : AppCompatActivity() {

  private lateinit var resultView1: TextView
  private lateinit var resultView2: TextView

  private var result1 = ""
  private var result2 = ""

  private val scope: CoroutineScope = MainScope()
  private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
  private var storageMode = TestEntity.StorageMode.IN_MEMORY
  private var isCollection = false
  private var setFromRemoteService = false
  private var singletonHandle: ReadWriteSingletonHandle<TestEntity>? = null
  private var collectionHandle: ReadWriteCollectionHandle<TestEntity>? = null

  private var allocator: Allocator? = null
  private var resurrectionArcId: ArcId? = null

  val storageEndpointManager = AndroidStorageServiceEndpointManager(
    scope,
    DefaultBindHelper(this)
  )

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
    findViewById<Button>(R.id.read_write_test).setOnClickListener {
      scope.launch { testReadWriteArc() }
    }
    findViewById<Button>(R.id.start_resurrection_arc).setOnClickListener {
      scope.launch { startResurrectionArc() }
    }
    findViewById<Button>(R.id.stop_read_service).setOnClickListener {
      scope.launch { stopReadService() }
    }
    findViewById<Button>(R.id.trigger_write).setOnClickListener {
      scope.launch { triggerWrite() }
    }
    findViewById<Button>(R.id.stop_resurrection_arc).setOnClickListener {
      scope.launch { stopResurrectionArc() }
    }
    findViewById<Button>(R.id.persistent_read_write_test).setOnClickListener {
      scope.launch {
        runPersistentPersonRecipe()
      }
    }
    DevToolsStarter(this).start()
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)

    intent?.run {
      if (this@run.hasExtra(RESULT_NAME)) {
        scope.launch {
          appendResultText(this@run.getStringExtra(RESULT_NAME) ?: "")
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

  private suspend fun testReadWriteArc() {
    appendResultText(getString(R.string.waiting_for_result))
    allocator = Allocator.create(
      AndroidManifestHostRegistry.create(this@TestActivity),
      HandleManagerImpl(
        time = JvmTime,
        scheduler = schedulerProvider("readWriteArc"),
        storageEndpointManager = storageEndpointManager,
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      scope
    )
    allocator?.startArcForPlan(PersonRecipePlan)
      ?.also { allocator?.stopArc(it.id) }
  }

  private suspend fun startResurrectionArc() {
    appendResultText(getString(R.string.waiting_for_result))
    allocator = Allocator.create(
      AndroidManifestHostRegistry.create(this@TestActivity),
      HandleManagerImpl(
        time = JvmTime,
        scheduler = schedulerProvider("resurrectionArc"),
        storageEndpointManager = storageEndpointManager,
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      scope
    )
    resurrectionArcId = allocator?.startArcForPlan(AnimalRecipePlan)?.id
  }

  private fun stopReadService() {
    val intent = Intent(
      this, ReadAnimalHostService::class.java
    )
    stopService(intent)
  }

  private fun triggerWrite() {
    val intent = Intent(
      this, WriteAnimalHostService::class.java
    ).apply {
      putExtra(WriteAnimalHostService.ARC_ID_EXTRA, resurrectionArcId?.toString())
    }
    startService(intent)
  }

  private suspend fun stopResurrectionArc() {
    resurrectionArcId?.let { allocator?.stopArc(it) }
  }

  private suspend fun runPersistentPersonRecipe() {
    appendResultText(getString(R.string.waiting_for_result))

    val allocator = Allocator.create(
      AndroidManifestHostRegistry.create(this@TestActivity),
      HandleManagerImpl(
        time = JvmTime,
        scheduler = schedulerProvider("allocator"),
        storageEndpointManager = storageEndpointManager,
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      scope
    )
    val arcId = allocator.startArcForPlan(PersonRecipePlan).id
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
    singletonHandle?.dispatcher?.let {
      withContext(it) { singletonHandle?.close() }
    }
    collectionHandle?.dispatcher?.let {
      withContext(it) { collectionHandle?.close() }
    }

    appendResultText(getString(R.string.waiting_for_result))

    val handleManager = HandleManagerImpl(
      time = JvmTime,
      scheduler = schedulerProvider("handle"),
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )
    if (isCollection) {
      @Suppress("UNCHECKED_CAST")
      collectionHandle = handleManager.createHandle(
        HandleSpec(
          "collectionHandle",
          HandleMode.ReadWrite,
          CollectionType(EntityType(TestEntity.SCHEMA)),
          TestEntity
        ),
        when (storageMode) {
          TestEntity.StorageMode.PERSISTENT -> TestEntity.collectionPersistentStorageKey
          else -> TestEntity.collectionInMemoryStorageKey
        }
      ).awaitReady() as ReadWriteCollectionHandle<TestEntity>

      collectionHandle?.dispatcher?.let {
        withContext(it) {
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
        }
      }
    } else {
      @Suppress("UNCHECKED_CAST")
      singletonHandle = handleManager.createHandle(
        HandleSpec(
          "singletonHandle",
          HandleMode.ReadWrite,
          SingletonType(EntityType(TestEntity.SCHEMA)),
          TestEntity
        ),
        when (storageMode) {
          TestEntity.StorageMode.PERSISTENT -> TestEntity.singletonPersistentStorageKey
          else -> TestEntity.singletonInMemoryStorageKey
        }
      ).awaitReady() as ReadWriteSingletonHandle<TestEntity>

      singletonHandle?.dispatcher?.let {
        withContext(it) {
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

          singletonHandle?.onDesync {
            scope.launch {
              fetchAndUpdateResult("onDesync")
            }
          }

          singletonHandle?.onResync {
            scope.launch {
              fetchAndUpdateResult("onResync")
            }
          }
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
          collectionHandle?.dispatcher?.let {
            withContext(it) {
              collectionHandle?.store(
                TestEntity(
                  text = TestEntity.text,
                  number = i.toDouble(),
                  boolean = TestEntity.boolean
                )
              )?.join()
            }
          }
        }
      } else {
        singletonHandle?.dispatcher?.let {
          withContext(it) {
            singletonHandle?.store(
              TestEntity(
                text = TestEntity.text,
                number = TestEntity.number,
                boolean = TestEntity.boolean
              )
            )?.join()
          }
        }
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
      singletonHandle?.dispatcher?.let {
        withContext(it) { singletonHandle?.clear()?.join() }
      }
      collectionHandle?.dispatcher?.let {
        withContext(it) { collectionHandle?.clear()?.join() }
      }
    }
  }

  private fun fetchAndUpdateResult(prefix: String) {
    var result: String? = "null"
    if (isCollection) {
      collectionHandle?.dispatcher?.let {
        val testEntities = runBlocking(it) { collectionHandle?.fetchAll() }
        if (testEntities != null && !testEntities.isNullOrEmpty()) {
          result = testEntities
            .sortedBy { it.number }
            .joinToString(separator = ";") { "${it.text},${it.number},${it.boolean}" }
        }
      }
    } else {
      singletonHandle?.dispatcher?.let {
        val testEntity = runBlocking(it) { singletonHandle?.fetch() }
        result = testEntity?.let {
          "${it.text},${it.number},${it.boolean}"
        }
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
