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

import android.content.Intent
import androidx.lifecycle.LifecycleService
import arcs.core.host.ArcHost

/**
 * Base [Service] for embedders of [ArcHost].
 */
abstract class ArcHostService : LifecycleService() {
    /**
     * Subclasses must override this with their own [ArcHost].
     */
    abstract val arcHost: ArcHost

    val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, arcHost)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }
}
