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
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.host.ArcHost
import arcs.core.host.EntityHandleManager
import arcs.core.host.ParticleRegistration
import arcs.jvm.host.JvmHost
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlinx.coroutines.Dispatchers

/**
 * An [ArcHost] runs on Android inside of a [Service].
 */
open class AndroidHost(
    val context: Context,
    val lifecycle: Lifecycle,
    vararg particles: ParticleRegistration
) : JvmHost(*particles) {
    override val activationFactory = ServiceStoreFactory(context, lifecycle)
}
