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
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.toRegistration
import arcs.jvm.host.JvmSchedulerProvider
import arcs.sdk.Handle
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Service wrapping an ArcHost which hosts a particle writing data to a handle.
 */
class WriteAnimalHostService : ArcHostService() {

    private val coroutineContext = Job() + Dispatchers.Main

    val arcHost: MyArcHost = MyArcHost(
        this,
        this.lifecycle,
        JvmSchedulerProvider(coroutineContext),
        ::WriteAnimal.toRegistration()
    )

    override val arcHosts = listOf(arcHost)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val arcId = intent?.getStringExtra(ARC_ID_EXTRA)
        val context = arcId?.let { arcHost.arcHostContext(it) }
        val writeAnimalParticle=
            context?.particles?.get("WriteAnimal")?.particle as? WriteAnimal
        writeAnimalParticle?.apply {
            scope.launch {
                handles.animal.store(WriteAnimal_Animal("capybara"))
            }
        }

        return super.onStartCommand(intent, flags, startId)
    }

    class MyArcHost(
        context: Context,
        lifecycle: Lifecycle,
        schedulerProvider: SchedulerProvider,
        vararg initialParticles: ParticleRegistration
    ) : AndroidHost(context, lifecycle, schedulerProvider, *initialParticles) {
        override val activationFactory = ServiceStoreFactory(context, lifecycle)

        fun arcHostContext(arcId: String) = getArcHostContext(arcId)
    }

    inner class WriteAnimal: AbstractWriteAnimal() {

        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            handles.animal.store(WriteAnimal_Animal("platypus"))
        }
    }

    companion object {
        const val ARC_ID_EXTRA = "arc_id_extra"
    }
}
