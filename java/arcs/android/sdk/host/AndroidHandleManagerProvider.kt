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
import arcs.core.host.AbstractArcHost.HandleManagerProvider
import arcs.core.host.EntityHandleManager
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

/**
 * Provides an [EntityHandleManager] for [ArcHost]s that will use the [StorageService]-backed
 * store implementations on Android platforms.
 */
class AndroidHandleManagerProvider(
    context: Context,
    lifecycle: Lifecycle,
    coroutineContext: CoroutineContext = EmptyCoroutineContext,
    connnectionFactory: ConnectionFactory? = null
) : HandleManagerProvider {
    private val schedulerProvider = JvmSchedulerProvider(coroutineContext)

    private val activationFactory = ServiceStoreFactory(
        context,
        lifecycle,
        coroutineContext,
        connnectionFactory
    )

    override fun invoke(arcId: String, hostId: String) = EntityHandleManager(
            arcId = arcId,
            hostId = hostId,
            time = JvmTime,
            activationFactory = activationFactory,
            scheduler = schedulerProvider.invoke(arcId)
        )
}
