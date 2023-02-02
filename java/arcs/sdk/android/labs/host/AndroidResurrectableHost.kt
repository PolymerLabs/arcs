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

/* ktlint-disable import-ordering */
import androidx.lifecycle.Lifecycle
import android.content.Context
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostContext
import arcs.core.host.ArcState
import arcs.core.host.HandleManagerFactory
import arcs.core.host.ParticleRegistration
import arcs.sdk.android.storage.ResurrectionHelper
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * An [AndroidHost] that can be resurrected via [ResurrectorService] if the [ArcHost] is
 * embedded in its own service.
 */
@OptIn(ExperimentalCoroutinesApi::class)
abstract class AndroidResurrectableHost(
  context: Context,
  lifecycle: Lifecycle,
  coroutineContext: CoroutineContext,
  arcSerializationContext: CoroutineContext,
  handleManagerFactory: HandleManagerFactory,
  vararg particles: ParticleRegistration
) : AndroidHost(
  context = context,
  lifecycle = lifecycle,
  coroutineContext = coroutineContext,
  arcSerializationContext = arcSerializationContext,
  handleManagerFactory = handleManagerFactory,
  particles = particles
),
  ResurrectableHost {

  override val resurrectionHelper: ResurrectionHelper = ResurrectionHelper(
    context
  )

  override fun maybeRequestResurrection(context: ArcHostContext) {
    if (context.arcState == ArcState.Running) {
      resurrectionHelper.requestResurrection(context.arcId, context.allReadableStorageKeys())
    }
  }

  override fun maybeCancelResurrection(context: ArcHostContext) {
    resurrectionHelper.cancelResurrectionRequest(context.arcId)
  }
}
