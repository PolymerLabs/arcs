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
import arcs.core.host.ArcHost
import arcs.core.host.HandleManagerFactory
import arcs.core.host.ParticleRegistration
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.toRegistration
import arcs.jvm.util.JvmTime
import arcs.sdk.android.labs.host.AndroidHost
import arcs.sdk.android.labs.host.ArcHostService
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.MainScope

/**
 * Service wrapping an ArcHost which hosts a particle writing data to a handle.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ReadAnimalHostService : ArcHostService() {

  private val coroutineScope = MainScope()

  private val handleManagerFactory = HandleManagerFactory(
    SimpleSchedulerProvider(coroutineScope.coroutineContext),
    AndroidStorageServiceEndpointManager(
      coroutineScope,
      DefaultBindHelper(this)
    ),
    JvmTime
  )

  override val arcHost: ArcHost = MyArcHost(
    this,
    this.lifecycle,
    handleManagerFactory,
    ::ReadAnimal.toRegistration()
  )

  override val arcHosts = listOf(arcHost)

  @OptIn(ExperimentalCoroutinesApi::class)
  class MyArcHost(
    context: Context,
    lifecycle: Lifecycle,
    handleManagerFactory: HandleManagerFactory,
    vararg initialParticles: ParticleRegistration
  ) : AndroidHost(
    context = context,
    lifecycle = lifecycle,
    coroutineContext = Dispatchers.Default,
    arcSerializationContext = Dispatchers.Default,
    handleManagerFactory = handleManagerFactory,
    particles = initialParticles
  )

  inner class ReadAnimal : AbstractReadAnimal() {
    override fun onStart() {
      handles.animal.onUpdate {
        val name = handles.animal.fetch()?.name ?: ""

        val intent = Intent(this@ReadAnimalHostService, TestActivity::class.java)
          .apply {
            putExtra(TestActivity.RESULT_NAME, name)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
          }
        startActivity(intent)
      }
    }
  }
}
