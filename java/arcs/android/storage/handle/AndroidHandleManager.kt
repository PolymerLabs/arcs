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
package arcs.android.storage.handle

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.Stores
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

/**
 * AndroidHandleManager will create a [HandleManager] instance, replacing the default
 * [ActivationFactoryFactory] with one that generates [ServiceStore] instances that can
 * communication with a running [StorageService].
 */
@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
fun AndroidHandleManager(
    context: Context,
    lifecycle: Lifecycle,
    coroutineContext: CoroutineContext = EmptyCoroutineContext,
    connectionFactory: ConnectionFactory? = null,
    stores: Stores = Stores()
) = HandleManager(
    JvmTime,
    stores,
    ServiceStoreFactory(
        context,
        lifecycle,
        coroutineContext,
        connectionFactory
    )
)
