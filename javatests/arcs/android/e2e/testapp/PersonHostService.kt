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
import arcs.android.sdk.host.ArcHostService
import arcs.android.sdk.host.androidArcHostConfiguration
import arcs.core.data.Plan
import arcs.core.host.BaseArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.toRegistration
import arcs.sdk.Handle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlin.coroutines.CoroutineContext

/**
 * Service which wraps an ArcHost containing person.arcs related particles.
 */
class PersonHostService : ArcHostService() {

    private val coroutineContext = Job() + Dispatchers.Main

    override val arcHost = MyArcHost(
        context = this,
        lifecycle = this.lifecycle,
        parentCoroutineContext = coroutineContext,
        initialParticles = *arrayOf(
            ::ReadPerson.toRegistration(),
            ::WritePerson.toRegistration()
        )
    )

    override val arcHosts = listOf(arcHost)

    inner class MyArcHost(
        context: Context,
        lifecycle: Lifecycle,
        parentCoroutineContext: CoroutineContext,
        vararg initialParticles: ParticleRegistration
    ) : BaseArcHost(
        androidArcHostConfiguration(
            context = context,
            lifecycle = lifecycle,
            parentCoroutineContext = parentCoroutineContext
        ),
        *initialParticles) {
        override suspend fun stopArc(partition: Plan.Partition) {
            super.stopArc(partition)
            if (isArcHostIdle) {
                sendResult("ArcHost is idle")
            }
        }
    }

    inner class ReadPerson : AbstractReadPerson() {
        override suspend fun onHandleSync(handle: arcs.core.entity.Handle, allSynced: Boolean) {
            super.onHandleSync(handle, allSynced)
            sendResult(handles.person.fetch()?.name ?: "")
            handles.person.onUpdate { person ->
                person?.name?.let { sendResult(it) }
            }
        }
    }

    inner class WritePerson : AbstractWritePerson() {
        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            // Always clear and re-write John Wick.
            handles.person.clear()

            // Write John Wick
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
