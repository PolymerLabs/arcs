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
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.storage.ActivationFactory
import arcs.core.storage.StoreManager
import arcs.jvm.util.JvmTime
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
    schedulerProvider: SchedulerProvider,
    activationFactory: ActivationFactory? = null,
    vararg particles: ParticleRegistration
) : AbstractArcHost(
    coroutineContext = coroutineContext,
    updateArcHostContextCoroutineContext = arcSerializationContext,
    schedulerProvider = schedulerProvider,
    initialParticles = *particles
), DefaultLifecycleObserver {
    init {
        lifecycle.addObserver(this)
    }

    override val platformTime = JvmTime

    @ExperimentalCoroutinesApi
    override val stores: StoreManager = StoreManager(activationFactory)

    override fun onDestroy(owner: LifecycleOwner) {
        super.onDestroy(owner)
        runBlocking {
            shutdown()
        }
    }

    override suspend fun shutdown() {
        super.shutdown()
        stores.reset()
    }
}
