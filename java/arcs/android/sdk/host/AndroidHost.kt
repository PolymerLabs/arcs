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
package arcs.android.sdk.host

import android.content.Context
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.HandleManagerProvider
import arcs.core.host.ParticleRegistration
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking

/**
 * An [ArcHost] that runs on Android inside of a [Service], uses [StorageService] for storage.
 */
@ExperimentalCoroutinesApi
abstract class AndroidHost(
    val context: Context,
    lifecycle: Lifecycle,
    coroutineContext: CoroutineContext,
    arcSerializationContext: CoroutineContext,
    handleManagerProvider: HandleManagerProvider,
    vararg particles: ParticleRegistration
) : AbstractArcHost(
    coroutineContext = coroutineContext,
    updateArcHostContextCoroutineContext = arcSerializationContext,
    handleManagerProvider = handleManagerProvider,
    initialParticles = *particles
), DefaultLifecycleObserver {
    init {
        lifecycle.addObserver(this)
    }

    override fun onDestroy(owner: LifecycleOwner) {
        super.onDestroy(owner)
        runBlocking {
            shutdown()
        }
    }

    override suspend fun shutdown() {
        super.shutdown()
    }
}
