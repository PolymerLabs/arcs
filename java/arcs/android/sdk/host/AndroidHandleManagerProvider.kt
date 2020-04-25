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
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

/**
 * Provides an [EntityHandleManager] for [ArcHost]s that will use the [StorageService]-backed
 * store implementations on Android platforms.
 *
 * @param context An Android application context that can be used to bind to the storage service.
 * @param lifecycle The lifecycle bounding all of the handles this provider will create.
 * @param parentCoroutineContext An optional coroutine context that can be used for cancellation.
 * @param connectionFactory allow specifying a different ConnectionFactory for testing
 */
class AndroidHandleManagerProvider(
    context: Context,
    lifecycle: Lifecycle,
    parentCoroutineContext: CoroutineContext = EmptyCoroutineContext,
    connnectionFactory: ConnectionFactory? = null
) : AbstractArcHost.Configuration.HandleManagerProvider {
    private val schedulerProvider = JvmSchedulerProvider(parentCoroutineContext)

    private val activationFactory = ServiceStoreFactory(
        context,
        lifecycle,
        parentCoroutineContext,
        connnectionFactory
    )

    override fun invoke(arcId: String, hostId: String) = EntityHandleManager(
        arcId = arcId,
        hostId = hostId,
        time = JvmTime,
        stores = StoreManager(),
        activationFactory = activationFactory,
        scheduler = schedulerProvider.invoke(arcId)
    )
}
