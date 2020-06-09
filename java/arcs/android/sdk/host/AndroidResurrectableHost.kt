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
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostContext
import arcs.core.host.ArcState
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.sdk.android.storage.ResurrectionHelper

/**
 * An [AndroidHost] that can be resurrected via [ResurrectorService] if the [ArcHost] is
 * embedded in its own service.
 */
abstract class AndroidResurrectableHost(
    context: Context,
    lifecycle: Lifecycle,
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
) : AndroidHost(context, lifecycle, schedulerProvider, *particles), ResurrectableHost {

    override val resurrectionHelper: ResurrectionHelper = ResurrectionHelper(
        context,
        ::onResurrected
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
