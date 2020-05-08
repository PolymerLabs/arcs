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
import arcs.android.util.ProtoPrefetcher
import arcs.core.host.ArcHost
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel

/**
 * Base [Service] for embedders of [ArcHost].
 */
abstract class ArcHostService : LifecycleService() {
    protected val scope: CoroutineScope = MainScope()

    // TODO: remove after G3 fixed
    abstract val arcHost: ArcHost

    /**
     * Subclasses must override this with their own [ArcHost]s.
     */
    open val arcHosts: List<ArcHost> by lazy { listOf(arcHost) }

    val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, *arcHosts.toTypedArray())
    }

    override fun onCreate() {
        super.onCreate()
        ProtoPrefetcher.prefetch()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
