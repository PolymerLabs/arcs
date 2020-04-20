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
import arcs.core.host.SchedulerProvider
import arcs.core.host.toRegistration
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.Handle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Service which wraps an ArcHost containing person.arcs related particles.
 */
class PersonHostService : ArcHostService() {

    private val coroutineContext = Job() + Dispatchers.Main

    override val arcHost = MyArcHost(
        this,
        this.lifecycle,
        JvmSchedulerProvider(coroutineContext),
        ::ReadPerson.toRegistration(),
        ::WritePerson.toRegistration()
    )

    override val arcHosts = listOf(arcHost)

    inner class MyArcHost(
        context: Context,
        lifecycle: Lifecycle,
        schedulerProvider: SchedulerProvider,
        vararg initialParticles: ParticleRegistration
    ) : AndroidHost(context, lifecycle, schedulerProvider, *initialParticles) {
        override val platformTime = JvmTime

        override suspend fun stopArc(partition: Plan.Partition) {
            super.stopArc(partition)
            if (isArcHostIdle) {
                sendResult("ArcHost is idle")
            }
        }
    }

    inner class ReadPerson : AbstractReadPerson() {

        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            scope.launch {
                val name = withContext(Dispatchers.IO) { handles.person.fetch()?.name ?: "" }
                sendResult(name)
            }
        }
    }

    inner class WritePerson : AbstractWritePerson() {

        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
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
