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
package arcs.android.host

import android.content.Intent
import androidx.lifecycle.LifecycleService
import arcs.android.sdk.host.AndroidResurrector
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.host.ArcHost
import arcs.jvm.host.scanForParticles

/**
 * An isolatable (can run in another process) [Service] that has a [ProdHost] inside. [Particle]
 * implementations wishing to run inside of this [Prod] should use `arcs_kt_particles` macro
 * to make themselves automatically discoverable by ProdHost.
 */
open class ProdArcHostService : LifecycleService() {

    val resurrector = AndroidResurrector(this)

    // Note: if this isn't lazy, then somehow resurrector is null, even though it shouldn't be
    open val arcHost: ArcHost by lazy {
        AndroidHost(this, this.lifecycle, resurrector, *scanForParticles())
    }

    val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, arcHost, resurrector)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }
}
