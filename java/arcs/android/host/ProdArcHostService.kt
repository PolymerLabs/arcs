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
import android.os.IBinder
import androidx.lifecycle.LifecycleService
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.host.ArcHost

/**
 * An isolatable (can run in another process) [Service] that has a [ProdHost] inside. [Particle]
 * implementations wishing to run inside of this [Prod] should use `arcs_kt_particles` macro
 * with `isolatable = True` to make themselves automatically discoverable by ProdHost.
 */
open class ProdArcHostService : LifecycleService() {

    open val arcHost: ArcHost = AndroidProdHost(this, this.getLifecycle())

    val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, arcHost)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }

    override fun onBind(intent: Intent): IBinder? = super.onBind(intent)
}
