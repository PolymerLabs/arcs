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

import android.content.Context
import android.content.Intent
import androidx.lifecycle.Lifecycle
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostService
import arcs.core.data.Plan
import arcs.core.host.ParticleRegistration
import arcs.core.host.toRegistration
import arcs.jvm.host.DirectHandleManagerProvider
import arcs.jvm.host.JvmSchedulerProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * Service which wraps an ArcHost containing person.arcs related particles.
 */
@ExperimentalCoroutinesApi
class PersonHostService : ArcHostService() {
    override val arcHost = MyArcHost(
        this,
        this.lifecycle,
        ::ReadPerson.toRegistration(),
        ::WritePerson.toRegistration()
    )

    override val arcHosts = listOf(arcHost)

    val handleManagerProvider =
        DirectHandleManagerProvider(JvmSchedulerProvider(Dispatchers.Default))

    @ExperimentalCoroutinesApi
    inner class MyArcHost(
        context: Context,
        lifecycle: Lifecycle,
        vararg initialParticles: ParticleRegistration
    ) : AndroidHost(
        context = context,
        lifecycle = lifecycle,
        coroutineContext = Dispatchers.Default,
        arcSerializationContext = Dispatchers.Default,
        handleManagerProvider = handleManagerProvider,
        particles = *initialParticles
    ) {
        override suspend fun stopArc(partition: Plan.Partition) {
            super.stopArc(partition)
            if (isArcHostIdle) {
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
