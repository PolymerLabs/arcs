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

import android.app.Service
import android.content.Intent
import android.os.IBinder
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.host.AbstractArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.toRegistration
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.Handle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Service which wraps an ArcHost.
 */
class ArcHostService : Service() {

    private val coroutineContext = Job() + Dispatchers.Main
    private val scope = CoroutineScope(coroutineContext)

    private val myHelper: ArcHostHelper by lazy {
        val host = MyArcHost(
            JvmSchedulerProvider(coroutineContext),
            ::ReadPerson.toRegistration(),
            ::WritePerson.toRegistration()
        )
        ArcHostHelper(this, host)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        myHelper.onStartCommand(intent)

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        coroutineContext.cancelChildren()
        super.onDestroy()
    }

    class MyArcHost(
        schedulerProvider: SchedulerProvider,
        vararg initialParticles: ParticleRegistration
    ) : AbstractArcHost(schedulerProvider, *initialParticles) {
        override val platformTime = JvmTime
    }

    inner class ReadPerson : AbstractReadPerson() {

        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            scope.launch {
                val name = withContext(Dispatchers.IO) { handles.person.fetch()?.name ?: "" }
                val intent = Intent(this@ArcHostService, TestActivity::class.java)
                    .apply {
                        putExtra(TestActivity.RESULT_NAME, name)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                startActivity(intent)
            }
        }
    }

    inner class WritePerson : AbstractWritePerson() {

        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            handles.person.store(WritePerson_Person("John Wick"))
        }
    }
}
