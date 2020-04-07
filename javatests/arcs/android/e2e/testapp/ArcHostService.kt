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
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.toRegistration
import arcs.sdk.Handle
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Service wrapping an ArcHost which hosts a particle writing data to a handle.
 */
class ArcHostService : ArcHostService() {

    private val coroutineContext = Job() + Dispatchers.Main

    override val arcHost: ArcHost = MyArcHost(
        this,
        this.lifecycle,
        initialParticles = *arrayOf(
            ::WritePerson.toRegistration(),
            ::ReadPerson.toRegistration()
        )
    )

    class MyArcHost(
        context: Context,
        lifecycle: Lifecycle,
        vararg initialParticles: ParticleRegistration
    ) : AndroidHost(context, lifecycle, *initialParticles) {
        override val activationFactory = ServiceStoreFactory(context, lifecycle)
    }

    inner class WritePerson : AbstractWritePerson() {

        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            handles.person.store(WritePerson_Person("John Wick"))
        }
    }

    inner class ReadPerson : AbstractReadPerson() {

        override suspend fun onHandleUpdate(handle: Handle) {
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
}
