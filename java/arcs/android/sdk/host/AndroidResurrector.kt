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

import android.app.Service
import arcs.core.host.Resurrector
import arcs.core.host.ResurrectorBase
import arcs.core.storage.StorageKey
import arcs.sdk.android.storage.ResurrectionHelper

/**
 * An implementation of [Resurrector] that is backed by [AndroidResurrector]. This implementation
 * currently has limitations, in that it does not persist the arcId to storageKey mappings, but
 * uses memory resident maps. This is a workaround until [ResurrectorService] is upgraded to
 * support this feature.
 */
open class AndroidResurrector(val context: Service) : ResurrectorBase() {
    val resurrectionHelper: ResurrectionHelper = ResurrectionHelper(
        context, ::onResurrectedInternal
    )

    override fun requestResurrection(arcId: String, storageKeys: List<StorageKey>) {
        super.requestResurrection(arcId, storageKeys)
        resurrectionHelper.requestResurrection(storageKeys)
    }

    override fun cancelResurrection(arcId: String) {
        super.cancelResurrection(arcId)
        if (arcIdToStorageKeys.isEmpty()) {
            /*
             * No affordance is made just to cancel a subscription to an arcId/storageKeys in the
             * current ResurrectorService :(
             */
            resurrectionHelper.cancelResurrectionRequest()
        }
    }
}
