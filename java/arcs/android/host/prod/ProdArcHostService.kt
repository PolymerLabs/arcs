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
import android.content.Intent
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleService
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.jvm.host.scanForParticles

/**
 * An isolatable (can run in another process) [Service] that has a [ProdHost] inside. [Particle]
 * implementations wishing to run inside of this [Prod] should use `arcs_kt_particles` macro
 * to make themselves automatically discoverable by ProdHost.
 */
@VisibleForTesting
open class ProdArcHostService : LifecycleService() {

    class ProdAndroidHost(
        context: Context,
        lifecycle: Lifecycle,
        vararg particles: ParticleRegistration
    ) : AndroidHost(context, lifecycle, *particles), ProdHost

    /**
     * This is open for tests to override, but normally isn't necessary.
     */
    open val arcHost: ArcHost by lazy {
        ProdAndroidHost(this, this.lifecycle, *scanForParticles())
    }

    val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, arcHost)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }
}
