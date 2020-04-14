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
import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostContext
import arcs.core.host.ArcState
import arcs.core.host.ParticleRegistration
import arcs.core.storage.StoreManager
import arcs.sdk.android.storage.ResurrectionHelper

/**
 * An [ArcHost] that runs on Android inside of a [Service], uses [StorageService] for storage, and
 * can be resurrected via [ResurrectorService] if the [ArcHost] is embedded in its own service.
 */
abstract class AndroidHost(
    val context: Context,
    val lifecycle: Lifecycle,
    vararg particles: ParticleRegistration
) : AbstractArcHost(
    AndroidHandleManagerProvider(context, lifecycle), *particles
), ResurrectableHost {

    override val resurrectionHelper: ResurrectionHelper = ResurrectionHelper(context,
        ::onResurrected)

    override fun maybeRequestResurrection(context: ArcHostContext) {
        if (context.arcState == ArcState.Running) {
            resurrectionHelper.requestResurrection(context.arcId, context.allReadableStorageKeys())
        }
    }

    override fun maybeCancelResurrection(context: ArcHostContext) {
        resurrectionHelper.cancelResurrectionRequest(context.arcId)
    }

    /*
     * Android uses [StorageService] which is a persistent process, so we don't share
     * [ActiveStore] between [EntityHandleManager]s, but use a new [StoreManager] for each
     * new arc. Otherwise, when closing an [ActiveStore] when one Arc is shutdown leads to the
     * handles being unusable in other arcs that are still arctive.
     */
    override val stores: StoreManager get() = StoreManager()
}
