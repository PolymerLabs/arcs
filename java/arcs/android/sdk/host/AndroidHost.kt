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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.OnLifecycleEvent
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.storage.ActivationFactory
import arcs.core.storage.StoreManager
import arcs.jvm.host.JvmHost
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking

/**
 * An [ArcHost] that runs on Android inside of a [Service], uses [StorageService] for storage.
 */
@ExperimentalCoroutinesApi
abstract class AndroidHost(
    val context: Context,
    lifecycle: Lifecycle,
    schedulerProvider: SchedulerProvider,
    override val activationFactory: ActivationFactory,
    vararg particles: ParticleRegistration
) : JvmHost(schedulerProvider, *particles), LifecycleObserver {

    @ExperimentalCoroutinesApi
    constructor(
        context: Context,
        lifecycle: Lifecycle,
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ) : this(
        context,
        lifecycle,
        schedulerProvider,
        ServiceStoreFactory(context, lifecycle),
        *particles
    )

    init {
        lifecycle.addObserver(this)
    }

    /*
     * Android uses [StorageService] which is a persistent process, so we don't share
     * [ActiveStore] between [EntityHandleManager]s, but use a new [StoreManager] for each
     * new arc. Otherwise, when closing an [ActiveStore] when one Arc is shutdown leads to the
     * handles being unusable in other arcs that are still active.
     */
    @ExperimentalCoroutinesApi
    override val stores: StoreManager get() = StoreManager(activationFactory)

    @OnLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    fun onLifecycleDestroyed() = runBlocking {
            shutdown()
    }
}
