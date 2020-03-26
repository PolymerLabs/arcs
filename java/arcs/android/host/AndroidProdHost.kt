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

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.jvm.host.AnnotationBasedJvmProdHost
import arcs.jvm.host.JvmProdHost
import arcs.sdk.android.storage.ServiceStoreFactory
import java.util.ServiceLoader

/**
 * An [ArcHost] that runs isolatable particles that are expected to have no platform
 * dependencies directly on Android APIs. Automatically scans class path using
 * [ServiceLoader] to find additional particles.
 */
class AndroidProdHost(
    val context: Context,
    val lifecycle: Lifecycle,
    vararg additionalParticles: ParticleRegistration
) : AnnotationBasedJvmProdHost(JvmProdHost::class, additionalParticles = *additionalParticles) {
    override val activationFactory = ServiceStoreFactory(context, lifecycle)
}
