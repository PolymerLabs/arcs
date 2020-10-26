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

import androidx.lifecycle.Lifecycle
import android.content.Context
import androidx.annotation.VisibleForTesting
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostService
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.core.host.SchedulerProvider
import arcs.core.storage.StorageEndpointManager
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.host.scanForParticles
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * An isolatable (can run in another process) [Service] that has a [ProdHost] inside. [Particle]
 * implementations wishing to run inside of this [Prod] should use `arcs_kt_particles` macro
 * to make themselves automatically discoverable by ProdHost.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
abstract class ProdArcHostService : ArcHostService() {
  @OptIn(ExperimentalCoroutinesApi::class)
  class ProdAndroidHost(
    context: Context,
    lifecycle: Lifecycle,
    coroutineContext: CoroutineContext,
    arcSerializationCoroutineContext: CoroutineContext,
    storageEndpointManager: StorageEndpointManager,
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) : AndroidHost(
    context = context,
    lifecycle = lifecycle,
    coroutineContext = coroutineContext,
    arcSerializationContext = arcSerializationCoroutineContext,
    storageEndpointManager = storageEndpointManager,
    schedulerProvider = schedulerProvider,
    particles = *particles
  ),
    ProdHost

  /** This is the [CoroutineContext] used for resurrection jobs on the [AbstractArcHost]s. */
  abstract val coroutineContext: CoroutineContext

  /** This is the [CoroutineContext] used for arc state storage on the [AbstractArcHost]s. */
  abstract val arcSerializationCoroutineContext: CoroutineContext

  /** The [StorageEndpointManager] to use for [ArcHost]s in this service. */
  abstract val storageEndpointManager: StorageEndpointManager

  /** This is open for tests to override, but normally isn't necessary. */
  override val arcHost: ArcHost by lazy {
    ProdAndroidHost(
      context = this,
      lifecycle = lifecycle,
      coroutineContext = coroutineContext,
      arcSerializationCoroutineContext = arcSerializationCoroutineContext,
      schedulerProvider = JvmSchedulerProvider(scope.coroutineContext),
      storageEndpointManager = storageEndpointManager,
      particles = *scanForParticles()
    )
  }

  override val arcHosts by lazy { listOf(arcHost) }
}
