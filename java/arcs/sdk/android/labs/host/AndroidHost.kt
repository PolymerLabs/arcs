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
package arcs.sdk.android.labs.host

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import android.content.Context
import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.HandleManagerFactory
import arcs.core.host.ParticleRegistration
import arcs.core.host.StoreBasedArcHostContextSerializer
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking

/**
 * An [ArcHost] that runs on Android inside of a [Service], uses [StorageService] for storage.
 */
@OptIn(ExperimentalCoroutinesApi::class)
abstract class AndroidHost(
  val context: Context,
  lifecycle: Lifecycle,
  coroutineContext: CoroutineContext,
  arcSerializationContext: CoroutineContext,
  handleManagerFactory: HandleManagerFactory,
  vararg particles: ParticleRegistration
) : AbstractArcHost(
  coroutineContext = coroutineContext,
  handleManagerFactory = handleManagerFactory,
  arcHostContextSerializer = StoreBasedArcHostContextSerializer(
    updateArcHostContextCoroutineContext = arcSerializationContext,
    handleManagerFactory
  ),
  initialParticles = particles
),
  DefaultLifecycleObserver {
  init {
    lifecycle.addObserver(this)
  }

  override fun onDestroy(owner: LifecycleOwner) {
    super.onDestroy(owner)
    runBlocking {
      shutdown()
    }
  }
}
