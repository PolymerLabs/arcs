/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.host.ArcHost
import arcs.core.host.EntityHandleManager
import arcs.core.host.ParticleRegistration
import arcs.jvm.host.JvmProdHost
import java.util.ServiceLoader
import kotlinx.coroutines.Dispatchers

/**
 * An [ArcHost] that runs isolatable particles that are expected to have no platform
 * dependencies directly on Android APIs. Automatically scans class path using
 * [ServiceLoader] to find additional particles.
 */
class AndroidProdHost(
    val context: Context,
    val lifecycle: Lifecycle,
    vararg additionalParticles: ParticleRegistration
) : JvmProdHost(additionalParticles = *additionalParticles) {
    override fun entityHandleManager(arcId: String) = EntityHandleManager(
        AndroidHandleManager(
            context,
            lifecycle,
            Dispatchers.Default
        ),
        arcId,
        hostId
    )
}
