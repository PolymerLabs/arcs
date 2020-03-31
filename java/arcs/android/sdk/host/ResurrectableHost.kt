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

import arcs.core.host.ArcHost
import arcs.core.storage.StorageKey
import arcs.sdk.android.storage.ResurrectionHelper

/**
 * An [ArcHost] which exposes a [ResurrectionHelper] and [onResurrected] method for [ArcHostHelper]
 * to hook into.
 */
interface ResurrectableHost : ArcHost {
    /** Implementing hosts must provide an instance of ResurrectionHelper */
    val resurrectionHelper: ResurrectionHelper

    /** Invoked by [ArcHostHelper.onStartCommand] when [ResurrectorService] wakes our arc. */
    fun onResurrected(arcId: String, affectedKeys: List<StorageKey>)
}
