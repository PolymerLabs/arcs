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
import arcs.core.data.Plan
import arcs.core.host.ParticleRegistration
import arcs.core.host.toRegistration
import arcs.jvm.util.JvmTime
import arcs.sdk.android.labs.host.AndroidHost
import arcs.sdk.android.labs.host.ArcHostService
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * Service which wraps an ArcHost containing person.arcs related particles.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class PersonHostService : ArcHostService() {

  override val arcHost = MyArcHost(
    this,
    this.lifecycle,
    ::ReadPerson.toRegistration(),
    ::WritePerson.toRegistration()
  )

  override val arcHosts = listOf(arcHost)

  @OptIn(ExperimentalCoroutinesApi::class)
  inner class MyArcHost(
    context: Context,
    lifecycle: Lifecycle,
    vararg initialParticles: ParticleRegistration
  ) : AndroidHost(
    context = context,
    lifecycle = lifecycle,
    coroutineContext = Dispatchers.Default,
    arcSerializationContext = Dispatchers.Default,
    storageEndpointManager = AndroidStorageServiceEndpointManager(
      CoroutineScope(Dispatchers.Default),
      DefaultBindHelper(this)
    ),
    particles = *initialParticles
  ) {
    override val platformTime = JvmTime

    override suspend fun stopArc(partition: Plan.Partition) {
      super.stopArc(partition)
      if (isArcHostIdle()) {
        sendResult("ArcHost is idle")
      }
    }
  }

  inner class ReadPerson : AbstractReadPerson() {
    override fun onStart() {
      handles.person.onUpdate { delta ->
        delta.new?.name?.let { sendResult(it) }
      }
    }

    override fun onReady() {
      sendResult(handles.person.fetch()?.name ?: "")
    }
  }

  inner class WritePerson : AbstractWritePerson() {
    override fun onFirstStart() {
      handles.person.store(WritePerson_Person("John Wick"))
    }
  }

  private fun sendResult(result: String) {
    val intent = Intent(this, TestActivity::class.java)
      .apply {
        putExtra(TestActivity.RESULT_NAME, result)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
    startActivity(intent)
  }
}
