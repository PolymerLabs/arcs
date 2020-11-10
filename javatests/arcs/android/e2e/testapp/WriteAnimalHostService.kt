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
import androidx.lifecycle.Lifecycle
import android.content.Context
import android.content.Intent
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.toRegistration
import arcs.core.storage.StorageEndpointManager
import arcs.sdk.android.labs.host.AndroidHost
import arcs.sdk.android.labs.host.ArcHostService
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

/**
 * Service wrapping an ArcHost which hosts a particle writing data to a handle.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class WriteAnimalHostService : ArcHostService() {

  private val coroutineScope = MainScope()

  override val arcHost: MyArcHost = MyArcHost(
    this,
    this.lifecycle,
    SimpleSchedulerProvider(coroutineScope.coroutineContext),
    AndroidStorageServiceEndpointManager(coroutineScope, DefaultBindHelper(this)),
    ::WriteAnimal.toRegistration()
  )

  override val arcHosts = listOf(arcHost)

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val arcId = intent?.getStringExtra(ARC_ID_EXTRA)
    val context = arcId?.let {
      runBlocking {
        arcHost.arcHostContext(it)
      }
    }
    val writeAnimalParticle =
      context?.particles?.first {
        it.planParticle.particleName == "WriteAnimal"
      }?.particle as? WriteAnimal
    writeAnimalParticle?.apply {
      scope.launch(handles.dispatcher) {
        handles.animal.store(WriteAnimal_Animal("capybara"))
      }
    }

    return super.onStartCommand(intent, flags, startId)
  }

  @OptIn(ExperimentalCoroutinesApi::class)
  class MyArcHost(
    context: Context,
    lifecycle: Lifecycle,
    schedulerProvider: SchedulerProvider,
    storageEndpointManager: StorageEndpointManager,
    vararg initialParticles: ParticleRegistration
  ) : AndroidHost(
    context = context,
    lifecycle = lifecycle,
    coroutineContext = Dispatchers.Default,
    arcSerializationContext = Dispatchers.Default,
    schedulerProvider = schedulerProvider,
    storageEndpointManager = storageEndpointManager,
    particles = *initialParticles
  ) {
    suspend fun arcHostContext(arcId: String) = getArcHostContext(arcId)
  }

  inner class WriteAnimal : AbstractWriteAnimal() {
    override fun onFirstStart() {
      handles.animal.store(WriteAnimal_Animal("platypus"))
    }
  }

  companion object {
    const val ARC_ID_EXTRA = "arc_id_extra"
  }
}
