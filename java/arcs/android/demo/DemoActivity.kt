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

package arcs.android.demo

// TODO(b/170962663) Disabled due to different ordering after copybara transformations.
/* ktlint-disable import-ordering */
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import arcs.android.labs.host.AndroidManifestHostRegistry
import arcs.core.allocator.Allocator
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.host.HandleManagerImpl
import arcs.core.host.HostRegistry
import arcs.core.host.SimpleSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/** Entry UI to launch Arcs demo. */
@OptIn(ExperimentalCoroutinesApi::class)
class DemoActivity : AppCompatActivity() {

  private val coroutineContext: CoroutineContext = Job() + Dispatchers.Main
  private val scope: CoroutineScope = CoroutineScope(coroutineContext)
  private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)

  /**
   * Recipe hand translated from 'person.arcs'
   */
  private lateinit var allocator: Allocator
  private lateinit var hostRegistry: HostRegistry

  private val storageEndpointManager = AndroidStorageServiceEndpointManager(
    scope,
    DefaultBindHelper(this)
  )

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    setContentView(R.layout.main_activity)

    scope.launch {
      hostRegistry = AndroidManifestHostRegistry.create(this@DemoActivity)

      allocator = Allocator.create(
        hostRegistry,
        HandleManagerImpl(
          time = JvmTime,
          scheduler = schedulerProvider("personArc"),
          storageEndpointManager = storageEndpointManager,
          foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
        ),
        scope
      )

      findViewById<Button>(R.id.person_test).setOnClickListener {
        testPersonRecipe()
      }
    }
  }

  override fun onDestroy() {
    scope.cancel()
    super.onDestroy()
  }

  private fun testPersonRecipe() {
    scope.launch {
      val arcId = allocator.startArcForPlan(PersonRecipePlan).id
      allocator.stopArc(arcId)
    }
  }
}
