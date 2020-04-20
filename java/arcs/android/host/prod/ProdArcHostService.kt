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
package arcs.android.host.prod

import android.content.Context
import androidx.annotation.VisibleForTesting
import androidx.lifecycle.Lifecycle
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostService
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.core.host.SchedulerProvider
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.host.scanForParticles

/**
 * An isolatable (can run in another process) [Service] that has a [ProdHost] inside. [Particle]
 * implementations wishing to run inside of this [Prod] should use `arcs_kt_particles` macro
 * to make themselves automatically discoverable by ProdHost.
 */
@VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
open class ProdArcHostService : ArcHostService() {
    class ProdAndroidHost(
        context: Context,
        lifecycle: Lifecycle,
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ) : AndroidHost(context, lifecycle, schedulerProvider, *particles), ProdHost

    /**
     * This is open for tests to override, but normally isn't necessary.
     */
    override val arcHost: ArcHost by lazy {
        ProdAndroidHost(
            this,
            this.lifecycle,
            JvmSchedulerProvider(scope.coroutineContext),
            *scanForParticles()
        )
    }

    override val arcHosts = listOf(arcHost)
}
