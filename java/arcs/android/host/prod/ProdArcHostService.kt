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
import arcs.android.sdk.host.ArcHostService
import arcs.android.sdk.host.androidArcHostConfiguration
import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.BaseArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.jvm.host.scanForParticles
import arcs.jvm.util.JvmTime
import kotlin.coroutines.CoroutineContext

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
        parentCoroutineContext: CoroutineContext,
        vararg particles: ParticleRegistration
    ) : BaseArcHost(
        androidArcHostConfiguration(
            context,
            lifecycle,
            parentCoroutineContext
        ),
        *particles
    ), ProdHost

    /**
     * This is open for tests to override, but normally isn't necessary.
     */
    override val arcHost: ArcHost by lazy {
        ProdAndroidHost(
            this,
            this.lifecycle,
            scope.coroutineContext,
            *scanForParticles()
        )
    }

    override val arcHosts = listOf(arcHost)
}
