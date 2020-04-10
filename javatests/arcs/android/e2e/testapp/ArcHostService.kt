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
import arcs.android.sdk.host.ArcHostService
import arcs.core.data.Plan
import arcs.core.host.AbstractArcHost
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
 * Service which wraps an ArcHost.
 */
class ArcHostService : ArcHostService() {

    private val coroutineContext = Job() + Dispatchers.Main

    override val arcHost = MyArcHost(
        this,
        JvmSchedulerProvider(coroutineContext),
        ::ReadPerson.toRegistration(),
        ::WritePerson.toRegistration()
    )

    inner class MyArcHost(
        val context: Context,
        schedulerProvider: SchedulerProvider,
        vararg initialParticles: ParticleRegistration
    ) : AbstractArcHost(schedulerProvider, *initialParticles) {

        override suspend fun stopArc(partition: Plan.Partition) {
            super.stopArc(partition)
            if (isArcHostIdle) {
                sendResult("ArcHost is idle")
            }
        }

        override val platformTime = JvmTime
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
        val intent = Intent(this@ArcHostService, TestActivity::class.java)
            .apply {
                putExtra(TestActivity.RESULT_NAME, result)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        startActivity(intent)
    }
}
